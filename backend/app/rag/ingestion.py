import uuid
from typing import List, Dict, Union
from backend.app.rag.qdrant_provider import qdrant
from backend.app.rag.rag_service import rag_service
from langchain_community.document_loaders import PyPDFLoader
import os

class IngestionPipeline:
    def __init__(self, collection_name: str = "knowledge_base"):
        self.collection_name = collection_name

    async def initialize(self):
        """Ensure the collection exists."""
        await qdrant.create_collection(self.collection_name)

    async def process_pdf(self, file_path: str, metadata: Dict = None):
        """Process a PDF file: load, chunk, embed, and store."""
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        
        all_chunks = []
        for doc in documents:
            chunks = rag_service.chunk_text(doc.page_content)
            all_chunks.extend(chunks)
            
        embeddings = await rag_service.get_embeddings(all_chunks)
        
        ids = [str(uuid.uuid4()) for _ in all_chunks]
        payloads = [
            {**(metadata or {}), "text": chunk, "source": file_path}
            for chunk in all_chunks
        ]
        
        await qdrant.upsert_documents(
            self.collection_name,
            vectors=embeddings,
            ids=ids,
            payloads=payloads
        )
        return len(all_chunks)

    async def process_text(self, text: str, metadata: Dict = None):
        """Process raw text: chunk, embed, and store."""
        chunks = rag_service.chunk_text(text)
        embeddings = await rag_service.get_embeddings(chunks)
        
        ids = [str(uuid.uuid4()) for _ in chunks]
        payloads = [
            {**(metadata or {}), "text": chunk, "index": i}
            for i, chunk in enumerate(chunks)
        ]
        
        await qdrant.upsert_documents(
            self.collection_name,
            vectors=embeddings,
            ids=ids,
            payloads=payloads
        )
        return len(chunks)

ingestion_pipeline = IngestionPipeline()
