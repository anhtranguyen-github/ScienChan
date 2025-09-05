import os
import json
from typing import AsyncGenerator
from fastapi import FastAPI, Request, UploadFile, File
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
    """Upload and process a document into the knowledge base."""
    content = await file.read()
    text = content.decode("utf-8") # Simplified, should handle PDF/etc.
    
    await ingestion_pipeline.initialize()
    num_chunks = await ingestion_pipeline.process_text(text, metadata={"filename": file.filename})
    
    return {"status": "success", "filename": file.filename, "chunks": num_chunks}

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
