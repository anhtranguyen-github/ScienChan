from typing import List
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

class RAGService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100,
            separators=["\n\n", "\n", ".", "!", "?", " ", ""]
        )

    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks."""
        return self.text_splitter.split_text(text)

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        return self.embeddings.embed_documents(texts)

    async def get_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for a single query."""
        return self.embeddings.embed_query(query)

rag_service = RAGService()
