import os
import shutil
import tempfile
import logging
from typing import List, Dict, Optional
from fastapi import UploadFile
from backend.app.rag.ingestion import ingestion_pipeline
from backend.app.rag.qdrant_provider import qdrant

logger = logging.getLogger(__name__)

class DocumentService:
    @staticmethod
    async def upload(file: UploadFile, workspace_id: str) -> int:
        """Process and ingest a new document."""
        # 1. Check for duplicates in the workspace
        docs = await qdrant.list_documents("knowledge_base", workspace_id=workspace_id)
        if any(d["name"] == file.filename for d in docs):
            raise ValueError(f"Document '{file.filename}' already exists in this workspace.")

        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        try:
            await ingestion_pipeline.initialize()
            num_chunks = await ingestion_pipeline.process_file(
                tmp_path, 
                metadata={"filename": file.filename, "workspace_id": workspace_id}
            )
            return num_chunks
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    @staticmethod
    async def list_by_workspace(workspace_id: str) -> List[Dict]:
        """List documents in a specific workspace."""
        await ingestion_pipeline.initialize()
        return await qdrant.list_documents("knowledge_base", workspace_id=workspace_id)

    @staticmethod
    async def list_all() -> List[Dict]:
        """Global document inventory across all workspaces."""
        response = await qdrant.client.scroll(
            collection_name="knowledge_base",
            limit=10000,
            with_payload=True,
            with_vectors=False
        )
        
        docs = {}
        for point in response[0]:
            source = point.payload.get("source")
            if not source: continue
            
            if source not in docs:
                docs[source] = {
                    "name": source,
                    "extension": point.payload.get("extension", "unknown"),
                    "workspace_id": point.payload.get("workspace_id", "default"),
                    "shared_with": point.payload.get("shared_with", []),
                    "chunks": 0,
                    "points": []
                }
            
            docs[source]["chunks"] += 1
            docs[source]["points"].append({"id": str(point.id), "payload": point.payload})
                    
        return list(docs.values())

    @staticmethod
    async def get_content(name: str) -> Optional[str]:
        """Fetch reconstructed document content."""
        return await qdrant.get_document_content("knowledge_base", name)

    @staticmethod
    async def delete(name: str, workspace_id: str):
        """Delete document from a workspace."""
        await qdrant.delete_document("knowledge_base", name, workspace_id=workspace_id)

    @staticmethod
    async def inspect(name: str) -> List[Dict]:
        """Deep inspection of document vectors and payload."""
        from qdrant_client.http import models as qmodels
        response = await qdrant.client.scroll(
            collection_name="knowledge_base",
            scroll_filter=qmodels.Filter(
                must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))]
            ),
            limit=100,
            with_payload=True,
            with_vectors=True
        )
        
        return [
            {
                "id": point.id,
                "payload": point.payload,
                "vector_size": len(point.vector) if point.vector else 0,
                "vector_preview": point.vector[:5] if point.vector else []
            }
            for point in response[0]
        ]

    @staticmethod
    async def update_workspaces(name: str, target_workspace_id: str, action: str):
        """Cross-workspace orchestration (move/share)."""
        from qdrant_client.http import models as qmodels
        
        if action == "move":
            await qdrant.client.set_payload(
                collection_name="knowledge_base",
                payload={"workspace_id": target_workspace_id},
                points=qmodels.Filter(must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))])
            )
        elif action == "share":
            res = await qdrant.client.scroll(
                collection_name="knowledge_base",
                scroll_filter=qmodels.Filter(must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))]),
                limit=1,
                with_payload=True
            )
            if res[0]:
                shared = res[0][0].payload.get("shared_with", [])
                if target_workspace_id not in shared:
                    shared.append(target_workspace_id)
                    await qdrant.client.set_payload(
                        collection_name="knowledge_base",
                        payload={"shared_with": shared},
                        points=qmodels.Filter(must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))])
                    )
        elif action == "unshare":
            await qdrant.client.set_payload(
                collection_name="knowledge_base",
                payload={"shared_with": []},
                points=qmodels.Filter(must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))])
            )

document_service = DocumentService()
