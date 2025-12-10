from typing import List, Optional, Dict
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

    async def search(self, query: str, workspace_id: str, limit: Optional[int] = None) -> List[Dict]:
        """
        Unified retrieval entry point. 
        Executes the fixed pipeline configured for the workspace.
        """
        from backend.app.core.settings_manager import settings_manager
        from backend.app.rag.qdrant_provider import qdrant
        from backend.app.rag.graph_provider import graph_provider

        settings = await settings_manager.get_settings(workspace_id)
        search_limit = limit or settings.search_limit
        
        # 1. Generate Query Vector
        query_vector = await self.get_query_embedding(query, workspace_id)
        
        # 2. Execute fixed mode (no dynamic switching)
        if settings.rag_engine == "graph":
            return await graph_provider.search(
                query=query,
                query_vector=query_vector,
                workspace_id=workspace_id,
                limit=search_limit
            )
        else:
            # Basic Hybrid RAG
            return await qdrant.hybrid_search(
                collection_name="knowledge_base",
                query_vector=query_vector,
                query_text=query,
                limit=search_limit,
                mode=settings.retrieval_mode,
                alpha=settings.hybrid_alpha,
                workspace_id=workspace_id
            )

rag_service = RAGService()
