import uuid
from typing import List, Optional, Dict
from backend.app.core.mongodb import mongodb_manager
from backend.app.rag.qdrant_provider import qdrant

class WorkspaceService:
    @staticmethod
    async def list_all() -> List[Dict]:
        db = mongodb_manager.get_async_database()
        cursor = db.workspaces.find()
        workspaces = await cursor.to_list(length=100)
        
        from qdrant_client.http import models as qmodels
        enhanced = []
        for ws in workspaces:
            thread_count = await db["thread_metadata"].count_documents({"workspace_id": ws["id"]})
            doc_count = await db["documents"].count_documents({"workspace_id": ws["id"]})
            ws["stats"] = {"thread_count": thread_count, "doc_count": doc_count}
            enhanced.append(ws)
        return enhanced

    @staticmethod
    async def create(name: str, description: Optional[str] = None) -> Dict:
        db = mongodb_manager.get_async_database()
        
        # Validation
        name = name.strip()
        if not name:
            raise ValueError("Workspace name cannot be empty.")
            
        illegal_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        if any(char in name for char in illegal_chars):
            raise ValueError(f"Workspace name contains illegal characters: {' '.join(illegal_chars)}")

        # Check for duplicate name
        existing = await db.workspaces.find_one({"name": name})
        if existing:
            raise ValueError(f"Workspace with name '{name}' already exists.")
            
        new_ws = {"id": str(uuid.uuid4())[:8], "name": name, "description": description}
        await db.workspaces.insert_one(new_ws)
        return new_ws

    @staticmethod
    async def update(workspace_id: str, data: Dict) -> Optional[Dict]:
        db = mongodb_manager.get_async_database()
        
        if "name" in data:
            new_name = data["name"].strip()
            if not new_name:
                raise ValueError("Workspace name cannot be empty.")
            illegal_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
            if any(char in new_name for char in illegal_chars):
                raise ValueError(f"Workspace name contains illegal characters: {' '.join(illegal_chars)}")
            
            existing = await db.workspaces.find_one({"name": new_name, "id": {"$ne": workspace_id}})
            if existing:
                raise ValueError(f"Workspace with name '{new_name}' already exists.")
            data["name"] = new_name
                
        return await db.workspaces.find_one_and_update(
            {"id": workspace_id},
            {"$set": data},
            return_document=True
        )

    @staticmethod
    async def delete(workspace_id: str):
        db = mongodb_manager.get_async_database()
        await db.workspaces.delete_one({"id": workspace_id})
        await db["thread_metadata"].delete_many({"workspace_id": workspace_id})

    @staticmethod
    async def get_details(workspace_id: str) -> Optional[Dict]:
        db = mongodb_manager.get_async_database()
        ws = await db.workspaces.find_one({"id": workspace_id})
        if not ws: return None
        
        threads = await db["thread_metadata"].find({"workspace_id": workspace_id}).sort("last_active", -1).to_list(100)
        for t in threads:
            t["id"] = t.get("thread_id", str(t.get("_id", "")))
            if "_id" in t: del t["_id"]
            
        doc_cursor = db.documents.find({"workspace_id": workspace_id})
        docs = await doc_cursor.to_list(length=100)
        for d in docs:
            if "_id" in d: d["_id"] = str(d["_id"])
            d["name"] = d.get("filename")
        
        ws["threads"] = threads
        ws["documents"] = docs
        ws["stats"] = {"thread_count": len(threads), "doc_count": len(docs)}
        
        from backend.app.core.settings_manager import settings_manager
        settings = await settings_manager.get_settings(workspace_id)
        ws["settings"] = settings.model_dump()
        
        return ws

workspace_service = WorkspaceService()
