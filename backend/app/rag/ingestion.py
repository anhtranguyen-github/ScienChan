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
    def __init__(self, collection_name: str = "knowledge_base"):
        self.collection_name = collection_name

    async def initialize(self):
        """Ensure the collection exists."""
        await qdrant.create_collection(self.collection_name)

    async def process_file(self, file_path: str, metadata: Dict = None):
        """
        Process various file types: PDF, TXT, MD, DOCX.
        Automatically selects the appropriate loader based on extension.
        """
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.pdf':
            loader = PyPDFLoader(file_path)
        elif ext in ['.txt', '.log']:
            loader = TextLoader(file_path)
        elif ext == '.md':
            # Note: Unstructured requires some extra system libs, 
            # for simpler setups TextLoader works for MD too.
            loader = TextLoader(file_path) 
        elif ext == '.docx':
            loader = Docx2txtLoader(file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")

        # Load and split
        documents = loader.load()
        
        all_chunks = []
        for doc in documents:
            chunks = rag_service.chunk_text(doc.page_content)
            all_chunks.extend(chunks)
            
        if not all_chunks:
            return 0

        # Generate embeddings
        embeddings = await rag_service.get_embeddings(all_chunks)
        
        # Prepare points
        ids = [str(uuid.uuid4()) for _ in all_chunks]
        payloads = [
            {
                **(metadata or {}), 
                "text": chunk, 
                "source": os.path.basename(file_path),
                "extension": ext
            }
            for chunk in all_chunks
        ]
        
        # Store in Qdrant
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
