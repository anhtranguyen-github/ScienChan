import os
from qdrant_client import QdrantClient
from qdrant_client.http import models

class QdrantProvider:
    def __init__(self, host: str = "localhost", port: int = 6333):
        self.client = QdrantClient(host=host, port=port)

    async def create_collection(self, collection_name: str, vector_size: int = 1536):
        """Create a new collection if it doesn't exist."""
        if not self.client.collection_exists(collection_name):
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE
                )
            )
            return True
        return False

    async def upsert_documents(self, collection_name: str, vectors, ids, payloads):
        """Upsert vectors into the collection."""
        self.client.upsert(
            collection_name=collection_name,
            points=models.Batch(
                ids=ids,
                vectors=vectors,
                payloads=payloads
            )
        )

    async def search(self, collection_name: str, query_vector, limit: int = 5):
        """Perform semantic search."""
        return self.client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=limit
        )

# Global instance
qdrant = QdrantProvider(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", 6333))
)
