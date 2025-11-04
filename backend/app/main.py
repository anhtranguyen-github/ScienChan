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
from backend.app.routers.workspaces import router as workspace_router

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
app.include_router(workspace_router)

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), workspace_id: str = "default"):
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
            metadata={"filename": file.filename, "workspace_id": workspace_id}
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
async def list_documents(workspace_id: str = "default"):
    """List all documents currently in the knowledge base."""
    await ingestion_pipeline.initialize()
    docs = await qdrant.list_documents("knowledge_base", workspace_id=workspace_id)
    return docs

@app.get("/documents/{name:path}")
async def get_document(name: str):
    """Fetch the content of a specific document."""
    content = await qdrant.get_document_content("knowledge_base", name)
    if content is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"name": name, "content": content}

@app.delete("/documents/{name:path}")
async def delete_document(name: str, workspace_id: str = "default"):
    """Delete a document from the knowledge base."""
    await qdrant.delete_document("knowledge_base", name, workspace_id=workspace_id)
    return {"status": "success", "message": f"Document {name} deleted."}

@app.get("/documents-all")
async def list_all_documents():
    """List all unique documents across all workspaces."""
    from qdrant_client.http import models as qmodels
    
    # We use scroll to get all points (up to 10k for this dashboard)
    response = await qdrant.client.scroll(
        collection_name="knowledge_base",
        limit=10000,
        with_payload=True,
        with_vectors=False
    )
    
    docs = {}
    for point in response[0]:
        source = point.payload.get("source")
        if not source: continue
        
        ws_id = point.payload.get("workspace_id", "default")
        shared = point.payload.get("shared_with", [])
        
        if source not in docs:
            docs[source] = {
                "name": source,
                "extension": point.payload.get("extension", "unknown"),
                "workspace_id": ws_id,
                "shared_with": shared,
                "chunks": 0,
                "points": []
            }
        
        docs[source]["chunks"] += 1
        # Add minimal point info for metadata view
        docs[source]["points"].append({
            "id": str(point.id),
            "payload": point.payload
        })
                
    return list(docs.values())

@app.get("/documents/{name:path}/inspect")
async def inspect_document(name: str):
    """Deep inspection of document points and embeddings."""
    from qdrant_client.http import models as qmodels
    
    response = await qdrant.client.scroll(
        collection_name="knowledge_base",
        scroll_filter=qmodels.Filter(
            must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))]
        ),
        limit=100,
        with_payload=True,
        with_vectors=True
    )
    
    inspection_data = []
    for point in response[0]:
        inspection_data.append({
            "id": point.id,
            "payload": point.payload,
            "vector_size": len(point.vector) if point.vector else 0,
            "vector_preview": point.vector[:5] if point.vector else []
        })
        
    return inspection_data
@app.post("/documents/update-workspaces")
async def update_document_workspaces(request: Request):
    """Update workspace assignment or sharing for a document."""
    data = await request.json()
    name = data.get("name")
    workspace_id = data.get("workspace_id") # Current owner
    target_workspace_id = data.get("target_workspace_id") # New owner or share target
    action = data.get("action", "share") # "move" or "share" or "unshare"
    
    if not name or not target_workspace_id:
        raise HTTPException(status_code=400, detail="name and target_workspace_id are required")
        
    from qdrant_client.http import models as qmodels
    
    if action == "move":
        # Change workspace_id for all points of this document
        await qdrant.client.set_payload(
            collection_name="knowledge_base",
            payload={"workspace_id": target_workspace_id},
            points=qmodels.Filter(
                must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))]
            )
        )
    elif action == "share":
        # Get existing points to preserve current sharing
        res = await qdrant.client.scroll(
            collection_name="knowledge_base",
            scroll_filter=qmodels.Filter(
                must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))]
            ),
            limit=1,
            with_payload=True
        )
        if res[0]:
            current_shared = res[0][0].payload.get("shared_with", [])
            if target_workspace_id not in current_shared:
                current_shared.append(target_workspace_id)
                await qdrant.client.set_payload(
                    collection_name="knowledge_base",
                    payload={"shared_with": current_shared},
                    points=qmodels.Filter(
                        must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))]
                    )
                )
    elif action == "unshare":
        await qdrant.client.set_payload(
            collection_name="knowledge_base",
            payload={"shared_with": []},
            points=qmodels.Filter(
                must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))]
            )
        )
        
    return {"status": "success", "message": f"Document {name} {action}ed successfully."}

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
async def list_chat_threads(workspace_id: str = "default"):
    """List all available chat threads for a workspace from MongoDB with their titles."""
    from backend.app.core.mongodb import mongodb_manager
    
    db = mongodb_manager.get_async_database()
    checkpoints_col = db["checkpoints"]
    metadata_col = db["thread_metadata"]
    
    # 1. Fetch metadata for the workspace to get relevant thread_ids
    workspace_threads = await metadata_col.find({"workspace_id": workspace_id}).to_list(None)
    thread_ids = [doc["thread_id"] for doc in workspace_threads]
    
    # 2. Aggregation to get unique thread IDs from checkpoints (in case metadata is missing or for sorting)
    # We filter by the thread_ids found in metadata for that workspace
    pipeline = [
        {"$match": {"thread_id": {"$in": thread_ids}}},
        {"$sort": {"_id": -1}},
        {"$group": {
            "_id": "$thread_id",
            "last_active": {"$first": "$_id"}
        }},
        {"$sort": {"last_active": -1}}
    ]
    
    results = await checkpoints_col.aggregate(pipeline).to_list(None)
    sorted_thread_ids = [res["_id"] for res in results]
    
    # Fetch titles and flags for sorted list
    meta_map = {doc["thread_id"]: doc for doc in workspace_threads}
    
    threads = []
    for tid in sorted_thread_ids:
        meta = meta_map.get(tid, {})
        threads.append({
            "id": tid,
            "title": meta.get("title", f"Chat {tid[:8]}"),
            "has_thinking": meta.get("has_thinking", False)
        })
    
    return {"threads": threads}

@app.patch("/chat/threads/{thread_id}/title")
async def update_thread_title(thread_id: str, request: Request):
    """Update the title of a specific thread."""
    from backend.app.core.mongodb import mongodb_manager
    data = await request.json()
    title = data.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
        
    db = mongodb_manager.get_async_database()
    col = db["thread_metadata"]
    await col.update_one(
        {"thread_id": thread_id},
        {"$set": {"title": title}},
        upsert=True
    )
    return {"status": "success", "title": title}

@app.delete("/chat/threads/{thread_id}")
async def delete_thread(thread_id: str):
    """Delete a thread and its history."""
    from backend.app.core.mongodb import mongodb_manager
    db = mongodb_manager.get_async_database()
    
    # Delete from checkpoints and thread_metadata
    await db["checkpoints"].delete_many({"thread_id": thread_id})
    await db["thread_metadata"].delete_one({"thread_id": thread_id})
    
    return {"status": "success", "message": f"Thread {thread_id} deleted"}

async def generate_thread_title(message: str, thread_id: str, workspace_id: str = "default"):
    """Generate a short title for the thread based on the first message."""
    from backend.app.core.llm_provider import get_llm
    from backend.app.core.mongodb import mongodb_manager
    
    try:
        # Check if title already exists
        db = mongodb_manager.get_async_database()
        col = db["thread_metadata"]
        exists = await col.find_one({"thread_id": thread_id})
        if exists:
            return
            
        llm = get_llm()
        prompt = f"Summarize the following user message into a very short (2-4 words) catchy title. Message: {message}\nTitle:"
        response = await llm.ainvoke(prompt)
        title = response.content.strip().strip('"')
        
        await col.update_one(
            {"thread_id": thread_id},
            {"$set": {"title": title, "workspace_id": workspace_id}},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Failed to generate title: {e}")

async def stream_graph_updates(message: str, thread_id: str = "default", workspace_id: str = "default") -> AsyncGenerator[str, None]:
    """Stream events from the LangGraph execution with persistence."""
    inputs = {
        "messages": [HumanMessage(content=message)],
        "workspace_id": workspace_id
    }
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
                    # Update metadata flag
                    from backend.app.core.mongodb import mongodb_manager
                    db = mongodb_manager.get_async_database()
                    await db["thread_metadata"].update_one(
                        {"thread_id": thread_id},
                        {"$set": {"has_thinking": True}}
                    )
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
    workspace_id = data.get("workspace_id", "default")
    logger.info(f"Received chat request for thread {thread_id} in workspace {workspace_id}: {message[:50]}...")
    
    # Generate title in background if it's potentially a new thread
    asyncio.create_task(generate_thread_title(message, thread_id, workspace_id))
    
    return StreamingResponse(
        stream_graph_updates(message, thread_id, workspace_id),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    from backend.app.core.config import ai_settings
    uvicorn.run(app, host="0.0.0.0", port=ai_settings.BACKEND_PORT)
