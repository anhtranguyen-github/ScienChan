import os
import shutil
import tempfile
import logging
import hashlib
import uuid
import io
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from fastapi import UploadFile

from backend.app.rag.ingestion import ingestion_pipeline
from backend.app.rag.qdrant_provider import qdrant
from backend.app.core.minio import minio_manager
from backend.app.core.mongodb import mongodb_manager
from backend.app.services.task_service import task_service
from backend.app.core.settings_manager import settings_manager

logger = logging.getLogger(__name__)

class DocumentService:
    @staticmethod
    async def upload(file: UploadFile, workspace_id: str) -> Tuple[str, bytes, str, str]:
        """Process and ingest a new document with background task tracking."""
        db = mongodb_manager.get_async_database()
        
        # 1. Local name duplicate check
        existing_doc = await db.documents.find_one({"workspace_id": workspace_id, "filename": file.filename})
        if existing_doc:
            raise ValueError(f"Document '{file.filename}' already exists in this workspace.")

        content = await file.read()
        file_size = len(content)
        file_type = file.content_type
        
        # Sanitize filename immediately for task tracking
        original_filename = file.filename
        safe_filename = "".join([c if c.isalnum() or c in "._-" else "_" for c in original_filename])
        
        # Create Task
        task_id = task_service.create_task("ingestion", {
            "filename": safe_filename,
            "workspace_id": workspace_id,
            "size": file_size
        })
        
        return task_id, content, safe_filename, file_type

    async def run_ingestion(self, task_id: str, safe_filename: str, content: bytes, content_type: str, workspace_id: str):
        """Internal method to run the pipeline steps with global vault deduplication."""
        db = mongodb_manager.get_async_database()
        try:
            task_service.update_task(task_id, status="processing", progress=10, message="Calculating signatures...")
            file_hash = hashlib.sha256(content).hexdigest()
            file_size = len(content)
            
            # 1. GLOBAL VAULT DEDUPLICATION CHECK
            # Check if this file already exists in ANY workspace (or in the vault)
            existing_vault_doc = await db.documents.find_one({"content_hash": file_hash})
            
            doc_id = str(uuid.uuid4())[:8]
            extension = os.path.splitext(safe_filename)[1].lower()
            version = 1
            timestamp = datetime.utcnow().isoformat()
            
            # RAG Config Hash for Traceability
            settings = await settings_manager.get_settings(workspace_id)
            rag_hash = settings.get_rag_hash()

            if existing_vault_doc:
                # REUSE PHYSICAL STORAGE (MinIO)
                minio_path = existing_vault_doc["minio_path"]
                task_service.update_task(task_id, progress=30, message="Linking to existing vault record...")
            else:
                # NEW PHYSICAL UPLOAD
                minio_path = f"vault/{doc_id}/v{version}/{safe_filename}"
                task_service.update_task(task_id, progress=30, message="Storing in global vault...")
                await minio_manager.upload_file(minio_path, io.BytesIO(content), file_size, content_type=content_type)

            # Create MongoDB record for THIS workspace
            doc_record = {
                "id": doc_id, 
                "workspace_id": workspace_id, 
                "filename": safe_filename,
                "extension": extension, 
                "minio_path": minio_path, 
                "status": "indexing",
                "current_version": version, 
                "content_hash": file_hash, 
                "size_bytes": file_size,
                "chunks": 0, 
                "created_at": timestamp, 
                "updated_at": timestamp, 
                "shared_with": [],
                "rag_config_hash": rag_hash  # Traceability
            }
            await db.documents.insert_one(doc_record)
            
            # Check if we can also reuse embeddings (Only if RAG config matches exactly)
            if existing_vault_doc and existing_vault_doc.get("rag_config_hash") == rag_hash:
                 task_service.update_task(task_id, progress=90, message="Reusing compatible embeddings...")
                 # Link the existing vectors in Qdrant to this new workspace_id
                 from qdrant_client.http import models as qmodels
                 await qdrant.client.set_payload(
                     collection_name=await qdrant.get_effective_collection("knowledge_base", workspace_id),
                     payload={"shared_with": [workspace_id]}, # Simple link by adding to shared_with or mirroring
                     points=qmodels.Filter(must=[qmodels.FieldCondition(key="content_hash", match=qmodels.MatchValue(value=file_hash))])
                 )
                 num_chunks = existing_vault_doc.get("chunks", 0)
                 await db.documents.update_one({"id": doc_id}, {"$set": {"status": "indexed", "chunks": num_chunks}})
                 task_service.update_task(task_id, status="completed", progress=100, message="Reused existing embeddings.")
                 return

            # Perform indexing if no match or incompatible config
            task_service.update_task(task_id, progress=50, message="Neural chunking...")
            suffix = extension
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            try:
                await ingestion_pipeline.initialize(workspace_id=workspace_id)
                task_service.update_task(task_id, progress=70, message="Generating embeddings...")
                
                num_chunks = await ingestion_pipeline.process_file(
                    tmp_path, 
                    metadata={
                        "filename": safe_filename, 
                        "workspace_id": workspace_id,
                        "doc_id": doc_id, 
                        "version": version, 
                        "minio_path": minio_path,
                        "content_hash": file_hash,
                        "rag_config_hash": rag_hash
                    }
                )
                
                await db.documents.update_one({"id": doc_id}, {"$set": {"status": "indexed", "chunks": num_chunks}})
                task_service.update_task(task_id, status="completed", progress=100, message="Successfully indexed.")
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                    
        except Exception as e:
            logger.error(f"Background ingestion failed for {safe_filename}: {e}")
            task_service.update_task(task_id, status="failed", message=str(e))
            await db.documents.update_one({"id": doc_id}, {"$set": {"status": "failed"}})

    @staticmethod
    async def list_by_workspace(workspace_id: str) -> List[Dict]:
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
            d["name"] = d.get("filename")
        return all_docs

    @staticmethod
    async def list_all() -> List[Dict]:
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
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({"filename": name})
        workspace_id = doc.get("workspace_id") if doc else None
        return await qdrant.get_document_content("knowledge_base", name, workspace_id=workspace_id)

    @staticmethod
    async def delete(name: str, workspace_id: str, vault_delete: bool = False):
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({"filename": name, "workspace_id": workspace_id})
        if not doc: return

        if vault_delete:
            # Check if this physical file is used by others
            others = await db.documents.count_documents({"minio_path": doc["minio_path"], "id": {"$ne": doc["id"]}})
            if others == 0:
                try:
                    minio_manager.delete_file(doc["minio_path"])
                except Exception as e:
                    logger.error(f"MinIO delete failed: {e}")
            
            await db.documents.delete_one({"id": doc["id"]})
            await qdrant.delete_document("knowledge_base", name, workspace_id=workspace_id)
        else:
            # SOFT REMOVAL
            if doc["workspace_id"] == workspace_id:
                await db.documents.update_one({"id": doc["id"]}, {"$set": {"workspace_id": "vault"}})
            elif workspace_id in doc.get("shared_with", []):
                await db.documents.update_one({"id": doc["id"]}, {"$pull": {"shared_with": workspace_id}})
            
            updated_doc = await db.documents.find_one({"id": doc["id"]})
            if updated_doc:
                from qdrant_client.http import models as qmodels
                await qdrant.client.set_payload(
                    collection_name=await qdrant.get_effective_collection("knowledge_base", workspace_id),
                    payload={
                        "workspace_id": updated_doc["workspace_id"],
                        "shared_with": updated_doc.get("shared_with", [])
                    },
                    points=qmodels.Filter(must=[qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=doc["id"]))])
                )

    @staticmethod
    async def inspect(name: str) -> List[Dict]:
        from qdrant_client.http import models as qmodels
        db = mongodb_manager.get_async_database()
        doc = await db.documents.find_one({"filename": name})
        workspace_id = doc.get("workspace_id") if doc else None
        collection_name = await qdrant.get_effective_collection("knowledge_base", workspace_id)
        
        response = await qdrant.client.scroll(
            collection_name=collection_name,
            scroll_filter=qmodels.Filter(must=[qmodels.FieldCondition(key="doc_id", match=qmodels.MatchValue(value=doc["id"]))]),
            limit=100,
            with_payload=True,
            with_vectors=True
        )
        return [{"id": p.id, "payload": p.payload, "vector_size": len(p.vector) if p.vector else 0} for p in response[0]]

    @staticmethod
    async def update_workspaces(name: str, target_workspace_id: str, action: str, force_reindex: bool = False):
        """Cross-workspace orchestration (move/share) with RAG Config auditing."""
        db = mongodb_manager.get_async_database()
        res = await db.documents.find_one({"filename": name})
        if not res: return

        target_settings = await settings_manager.get_settings(target_workspace_id)
        target_rag_hash = target_settings.get_rag_hash()
        
        # AUDIT: Check if target config matches existing embeddings
        is_config_compatible = res.get("rag_config_hash") == target_rag_hash
        
        if not is_config_compatible and not force_reindex:
            raise ValueError(f"Incompatible Workspace: Target RAG config ({target_rag_hash}) differs from Document ({res.get('rag_config_hash')})")

        if force_reindex or (not is_config_compatible):
            # Full Re-indexing Flow (Using shared vault document)
            file_data = minio_manager.get_file(res["minio_path"])
            if not file_data:
                raise ValueError("Source file missing in vault storage.")
                
            suffix = res.get("extension", ".tmp")
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name

            try:
                await ingestion_pipeline.initialize(workspace_id=target_workspace_id)
                await ingestion_pipeline.process_file(
                    tmp_path, 
                    metadata={
                        "filename": res["filename"], 
                        "workspace_id": target_workspace_id,
                        "doc_id": res["id"],
                        "version": res.get("current_version", 1),
                        "minio_path": res["minio_path"],
                        "content_hash": res["content_hash"],
                        "rag_config_hash": target_rag_hash
                    }
                )
                await db.documents.update_one({"id": res["id"]}, {"$set": {"rag_config_hash": target_rag_hash}})
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        # Update MongoDB Association
        if action == "move":
            await db.documents.update_one({"filename": name}, {"$set": {"workspace_id": target_workspace_id}})
        elif action == "share":
            await db.documents.update_one({"filename": name}, {"$addToSet": {"shared_with": target_workspace_id}})

document_service = DocumentService()
