from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.app.core.embedding_provider import get_embeddings

class RAGService:
    def __init__(self):
        self._embeddings = None
        # Advanced splitter: recursive character splitting
        # respects logical boundaries like paragraphs and sentences
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=150,
            separators=["\n\n", "\n", ". ", "! ", "? ", "; ", " ", ""],
            add_start_index=True
        )

    @property
    def embeddings(self):
        if self._embeddings is None:
            self._embeddings = get_embeddings()
        return self._embeddings

    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks using hierarchical recursive splitting."""
        # Clean text first
        text = " ".join(text.split())
        return self.text_splitter.split_text(text)

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using the flexible provider."""
        return await self.embeddings.aembed_documents(texts)

    async def get_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for a single query."""
        return await self.embeddings.aembed_query(query)

rag_service = RAGService()
