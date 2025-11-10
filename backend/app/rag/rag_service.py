from typing import List, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.app.providers.embedding import get_embeddings

class RAGService:
    def __init__(self):
        # Advanced splitter: recursive character splitting
        # respects logical boundaries like paragraphs and sentences
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=150,
            separators=["\n\n", "\n", ". ", "! ", "? ", "; ", " ", ""],
            add_start_index=True
        )

    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks using hierarchical recursive splitting."""
        # Clean text first
        text = " ".join(text.split())
        return self.text_splitter.split_text(text)

    async def get_embeddings(self, texts: List[str], workspace_id: Optional[str] = None) -> List[List[float]]:
        """Generate embeddings using the flexible provider."""
        provider = await get_embeddings(workspace_id)
        return await provider.aembed_documents(texts)

    async def get_query_embedding(self, query: str, workspace_id: Optional[str] = None) -> List[float]:
        """Generate embedding for a single query."""
        provider = await get_embeddings(workspace_id)
        return await provider.aembed_query(query)

rag_service = RAGService()
