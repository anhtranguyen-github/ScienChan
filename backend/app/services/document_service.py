import os
import shutil
import tempfile
import logging
import hashlib
import uuid
import io
from datetime import datetime
from typing import List, Dict, Optional
from fastapi import UploadFile

from backend.app.rag.ingestion import ingestion_pipeline
from backend.app.rag.qdrant_provider import qdrant
from backend.app.core.minio import minio_manager
from backend.app.core.mongodb import mongodb_manager
from backend.app.core.schemas import DocumentMetadata

logger = logging.getLogger(__name__)

class DocumentService:
    @staticmethod
    async def upload(file: UploadFile, workspace_id: str) -> int:
        """Process and ingest a new document with MinIO + MongoDB + Qdrant."""
        db = mongodb_manager.get_async_database()
        
        # 1. Check for name duplicates in MongoDB (more authority than Qdrant now)
        existing_doc = await db.documents.find_one({"workspace_id": workspace_id, "filename": file.filename})
        if existing_doc:
            raise ValueError(f"Document '{file.filename}' already exists in this workspace.")

        # 2. Read file and calculate hash
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)
        
        # 3. Check for hash duplicate in same workspace
        duplicate_hash = await db.documents.find_one({"workspace_id": workspace_id, "content_hash": file_hash})
        if duplicate_hash:
            logger.info(f"Duplicate content detected for {file.filename} (Hash: {file_hash[:10]}...)")
            # We could return early or allow rename of same content. 
            # For now, let's allow it but log it.

        # 4. Initialize metadata
        doc_id = str(uuid.uuid4())[:8]
        
        # Sanitize filename
        original_filename = file.filename
        safe_filename = "".join([c if c.isalnum() or c in "._-" else "_" for c in original_filename])
        if safe_filename != original_filename:
            logger.info(f"Sanitized filename from {original_filename} to {safe_filename}")
            
        extension = os.path.splitext(safe_filename)[1].lower()
        version = 1
        timestamp = datetime.utcnow().isoformat()
        
        # Path: <workspace_id>/<doc_id>/v<version>/filename
        minio_path = f"{workspace_id}/{doc_id}/v{version}/{safe_filename}"
        
        # 5. Create MongoDB record
        doc_record = {
            "id": doc_id,
            "workspace_id": workspace_id,
            "filename": safe_filename,
            "extension": extension,
            "minio_path": minio_path,
            "status": "uploading",
            "current_version": version,
            "content_hash": file_hash,
            "size_bytes": file_size,
            "chunks": 0,
            "created_at": timestamp,
            "updated_at": timestamp,
            "shared_with": []
        }
        await db.documents.insert_one(doc_record)

        # 6. Upload to MinIO
        try:
            await minio_manager.upload_file(
                minio_path,
                io.BytesIO(content),
                file_size,
                content_type=file.content_type
            )
            await db.documents.update_one({"id": doc_id}, {"$set": {"status": "indexing"}})
        except Exception as e:
            await db.documents.update_one({"id": doc_id}, {"$set": {"status": "failed"}})
            logger.error(f"Failed to upload {safe_filename} to MinIO: {e}")
            raise

        # 7. Ingest to Qdrant
        suffix = extension
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            await ingestion_pipeline.initialize()
            num_chunks = await ingestion_pipeline.process_file(
                tmp_path, 
                metadata={
                    "filename": safe_filename, 
                    "workspace_id": workspace_id,
                    "doc_id": doc_id,
                    "version": version,
                    "minio_path": minio_path
                }
            )
            
            # 8. Mark as indexed
            await db.documents.update_one(
                {"id": doc_id}, 
                {"$set": {"status": "indexed", "chunks": num_chunks}}
            )
            return num_chunks
        except Exception as e:
            await db.documents.update_one({"id": doc_id}, {"$set": {"status": "failed"}})
            logger.error(f"Ingestion failed for {file.filename}: {e}")
            raise
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    @staticmethod
    async def list_by_workspace(workspace_id: str) -> List[Dict]:
        """List documents from MongoDB (Source of truth for management)."""
        db = mongodb_manager.get_async_database()
        cursor = db.documents.find({"workspace_id": workspace_id})
        docs = await cursor.to_list(length=100)
        
        # Add shared documents
        shared_cursor = db.documents.find({"shared_with": workspace_id})
        shared_docs = await shared_cursor.to_list(length=100)
        
        all_docs = docs + shared_docs
        for d in all_docs:
            if d.get("shared_with") and workspace_id in d["shared_with"]:
                d["is_shared"] = True
            if "_id" in d:
                d["_id"] = str(d["_id"])
            # Maintain backward compatibility with frontend
            d["name"] = d.get("filename")
            
        return all_docs

    @staticmethod
    async def list_all() -> List[Dict]:
        """Global document inventory from MongoDB."""
        db = mongodb_manager.get_async_database()
        cursor = db.documents.find()
        docs = await cursor.to_list(length=1000)
        for d in docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
            d["name"] = d.get("filename")
        return docs

    @staticmethod
    async def get_content(name: str) -> Optional[str]:
        """Fetch reconstructed document content from Qdrant."""
        return await qdrant.get_document_content("knowledge_base", name)

    @staticmethod
    async def delete(name: str, workspace_id: str):
        """Delete document from all layers."""
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({"filename": name, "workspace_id": workspace_id})
        
        if doc:
            # 1. Delete from MinIO
            minio_manager.delete_file(doc["minio_path"])
            # 2. Delete from MongoDB
            await db.documents.delete_one({"id": doc["id"]})
            
        # 3. Delete from Qdrant
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
        db = mongodb_manager.get_async_database()
        
        if action == "move":
            await db.documents.update_one(
                {"filename": name},
                {"$set": {"workspace_id": target_workspace_id}}
            )
            # Update Qdrant too
            from qdrant_client.http import models as qmodels
            await qdrant.client.set_payload(
                collection_name="knowledge_base",
                payload={"workspace_id": target_workspace_id},
                points=qmodels.Filter(must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))])
            )
        elif action == "share":
            await db.documents.update_one(
                {"filename": name},
                {"$addToSet": {"shared_with": target_workspace_id}}
            )
            # Update Qdrant
            res = await db.documents.find_one({"filename": name})
            if res:
                from qdrant_client.http import models as qmodels
                await qdrant.client.set_payload(
                    collection_name="knowledge_base",
                    payload={"shared_with": res.get("shared_with", [])},
                    points=qmodels.Filter(must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))])
                )

document_service = DocumentService()
