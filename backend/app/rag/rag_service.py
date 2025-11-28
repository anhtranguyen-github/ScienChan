from typing import List, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.app.providers.embedding import get_embeddings

class RAGService:
    async def chunk_text(self, text: str, workspace_id: Optional[str] = None) -> List[str]:
        """Split text into chunks using hierarchical recursive splitting."""
        from backend.app.core.settings_manager import settings_manager
        settings = await settings_manager.get_settings(workspace_id)
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", ". ", "! ", "? ", "; ", " ", ""],
            add_start_index=True
        )
        # Clean text first
        text = " ".join(text.split())
        return splitter.split_text(text)

    async def get_embeddings(self, texts: List[str], workspace_id: Optional[str] = None) -> List[List[float]]:
        """Generate embeddings using the flexible provider."""
        provider = await get_embeddings(workspace_id)
        return await provider.aembed_documents(texts)

    async def get_query_embedding(self, query: str, workspace_id: Optional[str] = None) -> List[float]:
        """Generate embedding for a single query."""
        provider = await get_embeddings(workspace_id)
        return await provider.aembed_query(query)

rag_service = RAGService()
