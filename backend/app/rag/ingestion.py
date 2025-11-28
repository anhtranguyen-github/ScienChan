import uuid
import os
from typing import List, Dict, Union
from backend.app.rag.qdrant_provider import qdrant
from backend.app.rag.rag_service import rag_service
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
    Docx2txtLoader
)

class IngestionPipeline:
    def __init__(self):
        pass

    async def get_target_collection(self, workspace_id: str) -> str:
        """Determine collection name based on workspace embedding dimensions."""
        from backend.app.core.settings_manager import settings_manager
        settings = await settings_manager.get_settings(workspace_id)
        return qdrant.get_collection_name(settings.embedding_dim), settings.embedding_dim

    async def initialize(self, workspace_id: str = "default"):
        """Ensure the workspace's target collection exists."""
        name, dim = await self.get_target_collection(workspace_id)
        await qdrant.create_collection(name, vector_size=dim)
        return name

    async def process_file(self, file_path: str, metadata: Dict = None):
        """
        Process various file types: PDF, TXT, MD, DOCX.
        Automatically selects the appropriate loader based on extension.
        """
        ext = os.path.splitext(file_path)[1].lower()
        workspace_id = (metadata or {}).get("workspace_id", "default")
        
        target_collection, _ = await self.get_target_collection(workspace_id)
        
        if ext == '.pdf':
            loader = PyPDFLoader(file_path)
        elif ext in ['.txt', '.log', '.md']:
            loader = TextLoader(file_path)
        elif ext == '.docx':
            loader = Docx2txtLoader(file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")

        # Load and split
        documents = loader.load()
        
        all_chunks = []
        for doc in documents:
            chunks = await rag_service.chunk_text(doc.page_content, workspace_id=workspace_id)
            all_chunks.extend(chunks)
            
        if not all_chunks:
            return 0

        # Generate embeddings
        embeddings = await rag_service.get_embeddings(all_chunks, workspace_id=workspace_id)
        
        # Prepare points
        ids = [str(uuid.uuid4()) for _ in all_chunks]
        payloads = [
            {
                **(metadata or {}), 
                "text": chunk, 
                "source": (metadata or {}).get("filename") or os.path.basename(file_path),
                "extension": ext,
                "index": i,
                "workspace_id": workspace_id,
                "shared_with": (metadata or {}).get("shared_with", []),
                "doc_id": (metadata or {}).get("doc_id"),
                "version": (metadata or {}).get("version"),
                "minio_path": (metadata or {}).get("minio_path")
            }
            for i, chunk in enumerate(all_chunks)
        ]
        
        # Store in Qdrant
        await qdrant.upsert_documents(
            target_collection,
            vectors=embeddings,
            ids=ids,
            payloads=payloads
        )
        return len(all_chunks)

    async def process_text(self, text: str, metadata: Dict = None):
        """Process raw text: chunk, embed, and store."""
        workspace_id = (metadata or {}).get("workspace_id", "default")
        target_collection, _ = await self.get_target_collection(workspace_id)
        
        chunks = await rag_service.chunk_text(text, workspace_id=workspace_id)
        embeddings = await rag_service.get_embeddings(chunks, workspace_id=workspace_id)
        
        ids = [str(uuid.uuid4()) for _ in chunks]
        payloads = [
            {
                **(metadata or {}), 
                "text": chunk, 
                "index": i,
                "workspace_id": workspace_id,
                "shared_with": (metadata or {}).get("shared_with", [])
            }
            for i, chunk in enumerate(chunks)
        ]
        
        await qdrant.upsert_documents(
            target_collection,
            vectors=embeddings,
            ids=ids,
            payloads=payloads
        )
        return len(chunks)

ingestion_pipeline = IngestionPipeline()
