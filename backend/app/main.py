import os
import json
import shutil
import tempfile
from typing import AsyncGenerator
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

from backend.app.graph.builder import app as graph_app
from backend.app.rag.ingestion import ingestion_pipeline

load_dotenv()

app = FastAPI(title="LangGraph Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "LangGraph Chatbot API is running"}

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
        num_chunks = await ingestion_pipeline.process_file(
            tmp_path, 
            metadata={"filename": file.filename}
        )
        
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

async def stream_graph_updates(message: str) -> AsyncGenerator[str, None]:
    """Stream events from the LangGraph execution."""
    inputs = {"messages": [HumanMessage(content=message)]}
    
    async for event in graph_app.astream_events(inputs, version="v2"):
        kind = event["event"]
        
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
    """Streaming chat endpoint using SSE."""
    data = await request.json()
    message = data.get("message")
    
    return StreamingResponse(
        stream_graph_updates(message),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
