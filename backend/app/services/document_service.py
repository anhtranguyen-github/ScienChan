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
            await ingestion_pipeline.initialize(workspace_id=workspace_id)
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
        cursor = db.documents.find({
            "$or": [
                {"workspace_id": workspace_id},
                {"shared_with": workspace_id}
            ]
        })
        all_docs = await cursor.to_list(length=200)
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
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({"filename": name})
        workspace_id = doc.get("workspace_id") if doc else None
        return await qdrant.get_document_content("knowledge_base", name, workspace_id=workspace_id)

    @staticmethod
    async def delete(name: str, workspace_id: str, vault_delete: bool = False):
        """Delete document association or perform permanent vault purge."""
        db = mongodb_manager.get_async_database()
        
        # 1. Fetch document record
        doc = await db.documents.find_one({"filename": name})
        if not doc: return

        if vault_delete:
            # PERMANENT PURGE
            # Delete from MinIO
            try:
                minio_manager.delete_file(doc["minio_path"])
            except Exception as e:
                logger.error(f"MinIO delete failed: {e}")
            
            # Delete from MongoDB
            await db.documents.delete_one({"id": doc["id"]})
            
            # Delete from Qdrant (All points for this source)
            await qdrant.delete_document("knowledge_base", name)
        else:
            # SOFT REMOVAL (From workspace scope)
            if doc["workspace_id"] == workspace_id:
                # Is primary workspace. Move to "vault" (no primary workspace)
                await db.documents.update_one(
                    {"id": doc["id"]},
                    {"$set": {"workspace_id": "vault"}}
                )
            elif workspace_id in doc.get("shared_with", []):
                # Is shared workspace. Remove from shared_with list.
                await db.documents.update_one(
                    {"id": doc["id"]},
                    {"$pull": {"shared_with": workspace_id}}
                )
            
            # Also update Qdrant payload to reflect workspace removal
            updated_doc = await db.documents.find_one({"id": doc["id"]})
            if updated_doc:
                from qdrant_client.http import models as qmodels
                await qdrant.client.set_payload(
                    collection_name="knowledge_base",
                    payload={
                        "workspace_id": updated_doc["workspace_id"],
                        "shared_with": updated_doc.get("shared_with", [])
                    },
                    points=qmodels.Filter(must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))])
                )

    @staticmethod
    async def inspect(name: str) -> List[Dict]:
        """Deep inspection of document vectors and payload."""
        from qdrant_client.http import models as qmodels
        
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({"filename": name})
        workspace_id = doc.get("workspace_id") if doc else None
        
        collection_name = await qdrant.get_effective_collection("knowledge_base", workspace_id)
        
        response = await qdrant.client.scroll(
            collection_name=collection_name,
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
    async def update_workspaces(name: str, target_workspace_id: str, action: str, force_reindex: bool = False):
        """Cross-workspace orchestration (move/share) with optional re-indexing."""
        db = mongodb_manager.get_async_database()
        
        res = await db.documents.find_one({"filename": name})
        if not res: return

        from backend.app.core.settings_manager import settings_manager
        target_settings = await settings_manager.get_settings(target_workspace_id)
        source_settings = await settings_manager.get_settings(res["workspace_id"])
        
        is_incompatible = target_settings.embedding_dim != source_settings.embedding_dim
        
        if is_incompatible and not force_reindex:
            raise ValueError(f"Incompatible Workspace: Target expects {target_settings.embedding_dim}d, Document is {source_settings.embedding_dim}d")

        if force_reindex:
            # Full Re-indexing Flow
            file_data = minio_manager.get_file(res["minio_path"])
            if not file_data:
                raise ValueError("Source file missing in storage.")
                
            suffix = res.get("extension", ".tmp")
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name

            try:
                # Initialize target collection if needed
                await ingestion_pipeline.initialize(workspace_id=target_workspace_id)
                
                # Ingest into new collection/dimension
                await ingestion_pipeline.process_file(
                    tmp_path, 
                    metadata={
                        "filename": res["filename"], 
                        "workspace_id": target_workspace_id,
                        "doc_id": res["id"],
                        "version": res.get("current_version", 1),
                        "minio_path": res["minio_path"]
                    }
                )
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        # Update MongoDB Association
        if action == "move":
            await db.documents.update_one(
                {"filename": name},
                {"$set": {"workspace_id": target_workspace_id}}
            )
            # update vectors in original collection if it wasn't reindexed?
            # actually if we "move", the vectors in the old collection are now associated with the new WS
            # ONLY IF dimensions matched. If it was reindexed, they are already in the new collection.
            if not is_incompatible:
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
            # Update sharing status in Qdrant (for the vectors that matter)
            updated_doc = await db.documents.find_one({"filename": name})
            if updated_doc:
                from qdrant_client.http import models as qmodels
                # Update in source collection (dimension-aware)
                await qdrant.client.set_payload(
                    collection_name="knowledge_base",
                    payload={"shared_with": updated_doc.get("shared_with", [])},
                    points=qmodels.Filter(must=[qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=name))])
                )

document_service = DocumentService()
