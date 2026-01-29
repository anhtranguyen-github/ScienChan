import asyncio
import os
import sys

# Add the project root to sys.path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.rag.ingestion import ingestion_pipeline
from backend.app.graph.builder import app as graph_app
from langchain_core.messages import HumanMessage

async def main():
    print("\n--- Comprehensive Backend Test (RAG + Reasoning + Streaming) ---")
    queries = [
        "What methodology do the authors use to evaluate the attacks?",
        "What are some of the key findings regarding the vulnerabilities of black-box code completion engines?"
    ]
    
    for query in queries:
        print(f"\nUser Query: {query}")
        print("AI Response: ", end="", flush=True)
        
        inputs = {"messages": [HumanMessage(content=query)]}
        async for event in graph_app.astream_events(inputs, version="v2"):
            kind = event["event"]
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    print(content, end="", flush=True)
        print("\n")

if __name__ == "__main__":
    asyncio.run(main())
