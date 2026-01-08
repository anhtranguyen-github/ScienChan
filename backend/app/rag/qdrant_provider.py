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

    def get_collection_name(self, vector_size: int = 1536) -> str:
        """Standardized naming for dimension-specific collections."""
        return f"knowledge_base_{vector_size}"

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

    async def get_effective_collection(self, collection_name: str, workspace_id: Optional[str] = None):
        if collection_name == "knowledge_base" and workspace_id:
             from backend.app.core.settings_manager import settings_manager
             settings = await settings_manager.get_settings(workspace_id)
             return self.get_collection_name(settings.embedding_dim)
        return collection_name

    async def hybrid_search(
        self, 
        collection_name: str, 
        query_vector: List[float], 
        query_text: str, 
        limit: int = 5,
        mode: str = "hybrid",
        alpha: float = 0.5,
        workspace_id: Optional[str] = None
    ):
        """
        Perform hybrid search with workspace-level isolation.
        Filters by current workspace OR shared documents.
        """
        collection_name = await self.get_effective_collection(collection_name, workspace_id)
        
        # Define Workspace Filter
        filter_query = None
        if workspace_id:
            filter_query = qmodels.Filter(
                should=[
                    qmodels.FieldCondition(
                        key="workspace_id",
                        match=qmodels.MatchValue(value=workspace_id)
                    ),
                    qmodels.FieldCondition(
                        key="shared_with",
                        match=qmodels.MatchValue(value=workspace_id)
                    )
                ]
            )

        # 1. Vector Search using the new Query API
        response = await self.client.query_points(
            collection_name=collection_name,
            query=query_vector,
            query_filter=filter_query,
            limit=limit * 2,
            with_payload=True
        )
        vector_results = response.points
        
        # 2. Text/Keyword Search
        text_filter = filter_query or qmodels.Filter()
        if not text_filter.must:
            text_filter.must = []
        
        text_filter.must.append(
            qmodels.FieldCondition(
                key="text",
                match=qmodels.MatchText(text=query_text)
            )
        )

        text_results_response = await self.client.scroll(
            collection_name=collection_name,
            scroll_filter=text_filter,
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

    async def list_documents(self, collection_name: str, workspace_id: Optional[str] = None):
        """List distinct documents in the workspace (including shared ones)."""
        collection_name = await self.get_effective_collection(collection_name, workspace_id)
        
        filter_query = None
        if workspace_id:
            filter_query = qmodels.Filter(
                should=[
                    qmodels.FieldCondition(
                        key="workspace_id",
                        match=qmodels.MatchValue(value=workspace_id)
                    ),
                    qmodels.FieldCondition(
                        key="shared_with",
                        match=qmodels.MatchValue(value=workspace_id)
                    )
                ]
            )

        response = await self.client.scroll(
            collection_name=collection_name,
            scroll_filter=filter_query,
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
                    "chunks": 0,
                    "shared": point.payload.get("workspace_id") != workspace_id if workspace_id else False
                }
            if source:
                docs[source]["chunks"] += 1
                
        return list(docs.values())

    async def delete_document(self, collection_name: str, source_name: str, workspace_id: Optional[str] = None):
        """Delete a document from a specific workspace. 
        Note: If workspace_id is None, it might delete from ALL knowledge_base variants? 
        For safety, we usually have a workspace_id.
        """
        # If no workspace_id, we can't easily guess the collection unless we check all of them.
        # But our delete in DocumentService now passes workspace_id or we do a full purge.
        if workspace_id:
            collection_name = await self.get_effective_collection(collection_name, workspace_id)
            await self.client.delete(
                collection_name=collection_name,
                points_selector=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(
                            key="source",
                            match=qmodels.MatchValue(value=source_name)
                        ),
                        qmodels.FieldCondition(
                            key="workspace_id",
                            match=qmodels.MatchValue(value=workspace_id)
                        )
                    ]
                )
            )
        else:
            # Global Purge - Delete from all collections we manage
            # For simplicity, let's assume 1536 and 768 for now or list all collections.
            collections = ["knowledge_base_1536", "knowledge_base_768"]
            for c in collections:
                if await self.client.collection_exists(c):
                    await self.client.delete(
                        collection_name=c,
                        points_selector=qmodels.Filter(
                            must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=source_name))]
                        )
                    )

    async def get_document_content(self, collection_name: str, source_name: str, workspace_id: Optional[str] = None):
        """Retrieve and reconstruct the content of a document from its chunks."""
        collection_name = await self.get_effective_collection(collection_name, workspace_id)
        
        response = await self.client.scroll(
            collection_name=collection_name,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="source",
                        match=qmodels.MatchValue(value=source_name)
                    )
                ]
            ),
            limit=1000,
            with_payload=True
        )
        points = response[0]
        if not points:
            return None
        
        try:
            sorted_points = sorted(points, key=lambda x: x.payload.get("index", 0))
        except:
            sorted_points = points
            
        content = "\n\n".join([p.payload.get("text", "") for p in sorted_points])
        return content

    async def get_document_centroids(self, workspace_id: str):
        """Calculate the average vector (centroid) for each document in the workspace."""
        collection_name = await self.get_effective_collection("knowledge_base", workspace_id)
        
        # Scroll through all points in the workspace with vectors
        response = await self.client.scroll(
            collection_name=collection_name,
            scroll_filter=qmodels.Filter(
                should=[
                    qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=workspace_id)),
                    qmodels.FieldCondition(key="shared_with", match=qmodels.MatchValue(value=workspace_id))
                ]
            ),
            limit=10000,
            with_payload=True,
            with_vectors=True
        )
        
        points = response[0]
        doc_vectors = {} # doc_id -> list of vectors
        doc_names = {} # doc_id -> name
        
        for p in points:
            doc_id = p.payload.get("doc_id")
            if not doc_id: continue
            
            if doc_id not in doc_vectors:
                doc_vectors[doc_id] = []
                # Prefer source name from payload
                doc_names[doc_id] = p.payload.get("source", "Unknown Document")
            
            if p.vector:
                doc_vectors[doc_id].append(p.vector)
            
        centroids = {}
        import numpy as np
        for doc_id, vectors in doc_vectors.items():
            if vectors:
                centroids[doc_id] = {
                    "vector": np.mean(vectors, axis=0).tolist(),
                    "name": doc_names[doc_id]
                }
        return centroids

# Global instance
qdrant = QdrantProvider()

# Global instance
qdrant = QdrantProvider()
