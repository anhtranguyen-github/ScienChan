import os
from typing import List, Dict, Optional
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels
from backend.app.core.config import ai_settings

class QdrantProvider:
    def __init__(self):
        self.client = AsyncQdrantClient(
            host=ai_settings.QDRANT_HOST,
            port=ai_settings.QDRANT_PORT
        )

    async def create_collection(self, collection_name: str, vector_size: int = 1536):
        """Create a new collection with optimized HNSW and keyword indexing."""
        if not await self.client.collection_exists(collection_name):
            await self.client.create_collection(
                collection_name=collection_name,
                vectors_config=qmodels.VectorParams(
                    size=vector_size,
                    distance=qmodels.Distance.COSINE,
                    on_disk=True # Optimize for memory
                ),
                optimizers_config=qmodels.OptimizersConfigDiff(
                    indexing_threshold=10000,
                ),
            )
            # Add payload indexing for common fields to speed up filtering/keyword search
            await self.client.create_payload_index(
                collection_name=collection_name,
                field_name="text",
                field_schema="text",
            )
            return True
        return False

    async def upsert_documents(self, collection_name: str, vectors, ids, payloads):
        """Upsert vectors into the collection."""
        await self.client.upsert(
            collection_name=collection_name,
            points=qmodels.Batch(
                ids=ids,
                vectors=vectors,
                payloads=payloads
            ),
            wait=True
        )

    async def hybrid_search(
        self, 
        collection_name: str, 
        query_vector: List[float], 
        query_text: str, 
        limit: int = 5,
        mode: str = "hybrid",
        alpha: float = 0.5
    ):
        """
        Perform hybrid search utilizing Qdrant's Query API.
        Combines dense vector search with full-text matching if supported by the model,
        or uses RRF style fusion logic.
        """
        # Qdrant 1.10+ supports advanced Query API
        # For simplicity in this template, we'll use a weighted search approach
        
        # 1. Vector Search using the new Query API
        response = await self.client.query_points(
            collection_name=collection_name,
            query=query_vector,
            limit=limit * 2,
            with_payload=True
        )
        vector_results = response.points
        
        # 2. Text/Keyword Search (using payload filter as a proxy for simpler setups)
        # In a real production setup, we'd use a separate BM25 index or Qdrant's full-text features
        text_results_response = await self.client.scroll(
            collection_name=collection_name,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="text",
                        match=qmodels.MatchText(text=query_text)
                    )
                ]
            ),
            limit=limit * 2,
            with_payload=True
        )
        text_results = text_results_response[0]
        
        if mode == "vector":
            return [{"id": hit.id, "payload": hit.payload, "score": hit.score} for hit in vector_results[:limit]]
        elif mode == "keyword":
            return [{"id": hit.id, "payload": hit.payload, "score": 1.0} for hit in text_results[:limit]]
            
        # 3. Combine using Reciprocal Rank Fusion (RRF)
        return self._fuse_results(vector_results, text_results, limit)

    def _fuse_results(self, vector_hits, text_hits, limit, k=60):
        """Reciprocal Rank Fusion."""
        scores = {}
        payload_map = {}
        
        for rank, hit in enumerate(vector_hits):
            scores[hit.id] = scores.get(hit.id, 0) + 1.0 / (k + rank + 1)
            payload_map[hit.id] = hit.payload
            
        for rank, hit in enumerate(text_hits):
            scores[hit.id] = scores.get(hit.id, 0) + 1.0 / (k + rank + 1)
            if hit.id not in payload_map:
                payload_map[hit.id] = hit.payload
                
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        
        return [
            {"id": doc_id, "payload": payload_map[doc_id], "score": scores[doc_id]}
            for doc_id in sorted_ids[:limit]
        ]

    async def list_documents(self, collection_name: str):
        """List distinct documents in the collection using the 'source' field."""
        # Use scroll to get unique sources from the payload
        response = await self.client.scroll(
            collection_name=collection_name,
            limit=10000,
            with_payload=True,
            with_vectors=False
        )
        
        docs = {}
        for point in response[0]:
            source = point.payload.get("source")
            if source and source not in docs:
                docs[source] = {
                    "name": source,
                    "extension": point.payload.get("extension", "unknown"),
                    "chunks": 0
                }
            if source:
                docs[source]["chunks"] += 1
                
        return list(docs.values())

    async def delete_document(self, collection_name: str, source_name: str):
        """Delete all points associated with a specific source."""
        return await self.client.delete(
            collection_name=collection_name,
            points_selector=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="source",
                        match=qmodels.MatchValue(value=source_name)
                    )
                ]
            )
        )

# Global instance
qdrant = QdrantProvider()
