import os
import json
import shutil
import tempfile
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

from backend.app.graph.builder import app as graph_app
from backend.app.rag.ingestion import ingestion_pipeline
from backend.app.rag.qdrant_provider import qdrant
from backend.app.routers.tools import router as tools_router
from backend.app.routers.settings import router as settings_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="LangGraph Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "LangGraph Chatbot API is running"}

app.include_router(tools_router)
app.include_router(settings_router)

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a document into the knowledge base.
    Supports PDF, TXT, MD, and DOCX.
    """
    try:
        # Create a temporary file to store the upload
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        await ingestion_pipeline.initialize()
        
        # Process using the optimized unified pipeline
        logger.info(f"Starting processing for file: {file.filename}")
        num_chunks = await ingestion_pipeline.process_file(
            tmp_path, 
            metadata={"filename": file.filename}
        )
        logger.info(f"Successfully processed {num_chunks} chunks for file: {file.filename}")
        
        # Cleanup
        os.remove(tmp_path)
        
        return {
            "status": "success", 
            "filename": file.filename, 
            "chunks": num_chunks,
            "message": f"Successfully processed {num_chunks} chunks."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents")
async def list_documents():
    """List all documents currently in the knowledge base."""
    await ingestion_pipeline.initialize()
    docs = await qdrant.list_documents("knowledge_base")
    return docs

@app.get("/documents/{name:path}")
async def get_document(name: str):
    """Fetch the content of a specific document."""
    content = await qdrant.get_document_content("knowledge_base", name)
    if content is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"name": name, "content": content}

@app.delete("/documents/{name:path}")
async def delete_document(name: str):
    """Delete a document from the knowledge base."""
    await qdrant.delete_document("knowledge_base", name)
    return {"status": "success", "message": f"Document {name} deleted."}

@app.get("/chat/history/{thread_id}")
async def get_chat_history(thread_id: str):
    """Fetch the chat history for a specific thread."""
    logger.info(f"Fetching chat history for thread: {thread_id}")
    config = {"configurable": {"thread_id": thread_id}}
    state = await graph_app.aget_state(config)
    
    if not state or "messages" not in state.values:
        return {"messages": []}
    
    # Convert messages to a serializable format
    history = []
    for msg in state.values["messages"]:
        msg_data = {
            "role": "user" if msg.type == "human" else "assistant",
            "content": msg.content,
            "id": getattr(msg, "id", None)
        }
        
        # Add reasoning steps and sources if they exist in metadata
        if hasattr(msg, "additional_kwargs"):
            if "reasoning_steps" in msg.additional_kwargs:
                msg_data["reasoning_steps"] = msg.additional_kwargs["reasoning_steps"]
            if "sources" in msg.additional_kwargs:
                msg_data["sources"] = msg.additional_kwargs["sources"]
        
        history.append(msg_data)
    return {"messages": history}

@app.get("/chat/threads")
async def list_chat_threads():
    """List all available chat threads from MongoDB with their titles."""
    from backend.app.core.mongodb import mongodb_manager
    
    db = mongodb_manager.get_async_database()
    checkpoints_col = db["checkpoints"]
    metadata_col = db["thread_metadata"]
    
    # Aggregation to get unique thread IDs sorted by most recent activity
    pipeline = [
        {"$sort": {"_id": -1}},
        {"$group": {
            "_id": "$thread_id",
            "last_active": {"$first": "$_id"}
        }},
        {"$sort": {"last_active": -1}}
    ]
    
    results = await checkpoints_col.aggregate(pipeline).to_list(None)
    thread_ids = [res["_id"] for res in results]
    
    # Fetch existing titles
    metadata_docs = await metadata_col.find({"thread_id": {"$in": thread_ids}}).to_list(None)
    title_map = {doc["thread_id"]: doc.get("title") for doc in metadata_docs}
    
    threads = []
    for tid in thread_ids:
        threads.append({
            "id": tid,
            "title": title_map.get(tid, f"Chat {tid[:8]}"),
            "has_thinking": tid in title_map
        })
    
    return {"threads": threads}

async def generate_thread_title(message: str, thread_id: str):
    """Generate a short title for the thread based on the first message."""
    from langchain_openai import ChatOpenAI
    from backend.app.core.config import ai_settings
    from backend.app.core.mongodb import mongodb_manager
    
    try:
        # Check if title already exists
        db = mongodb_manager.get_async_database()
        col = db["thread_metadata"]
        exists = await col.find_one({"thread_id": thread_id})
        if exists:
            return
            
        llm = ChatOpenAI(model=ai_settings.LLM_MODEL)
        prompt = f"Summarize the following user message into a very short (2-4 words) catchy title. Message: {message}\nTitle:"
        response = await llm.ainvoke(prompt)
        title = response.content.strip().strip('"')
        
        await col.update_one(
            {"thread_id": thread_id},
            {"$set": {"title": title}},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Failed to generate title: {e}")

async def stream_graph_updates(message: str, thread_id: str = "default") -> AsyncGenerator[str, None]:
    """Stream events from the LangGraph execution with persistence."""
    inputs = {"messages": [HumanMessage(content=message)]}
    config = {"configurable": {"thread_id": thread_id}}
    
    async for event in graph_app.astream_events(inputs, config=config, version="v2"):
        kind = event["event"]
        name = event.get("name", "")
        
        # Capture reasoning steps when nodes finish
        if kind == "on_chain_end" and name in ["retrieve", "reason", "generate"]:
            output = event["data"].get("output", {})
            if isinstance(output, dict):
                from backend.app.core.settings_manager import settings_manager
                settings = settings_manager.get_settings()
                
                if settings.show_reasoning and "reasoning_steps" in output:
                    yield f"data: {json.dumps({'type': 'reasoning', 'steps': output['reasoning_steps']})}\n\n"
                if "sources" in output:
                    yield f"data: {json.dumps({'type': 'sources', 'sources': output['sources']})}\n\n"
        
        if kind == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if content:
                yield f"data: {json.dumps({'type': 'content', 'delta': content})}\n\n"
        
        elif kind == "on_tool_start":
            yield f"data: {json.dumps({'type': 'tool_start', 'tool': event['name']})}\n\n"
            
        elif kind == "on_tool_end":
            yield f"data: {json.dumps({'type': 'tool_end', 'tool': event['name'], 'output': event['data'].get('output')})}\n\n"

@app.post("/chat/stream")
async def chat_stream(request: Request):
    """Streaming chat endpoint using SSE with thread persistence."""
    import asyncio
    data = await request.json()
    message = data.get("message")
    thread_id = data.get("thread_id", "default")
    logger.info(f"Received chat request for thread {thread_id}: {message[:50]}...")
    
    # Generate title in background if it's potentially a new thread
    asyncio.create_task(generate_thread_title(message, thread_id))
    
    return StreamingResponse(
        stream_graph_updates(message, thread_id),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    from backend.app.core.config import ai_settings
    uvicorn.run(app, host="0.0.0.0", port=ai_settings.BACKEND_PORT)
