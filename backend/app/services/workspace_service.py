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
            res_info = await qdrant.client.count(
                collection_name="knowledge_base",
                count_filter=qmodels.Filter(must=[qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=ws["id"]))])
            )
            ws["stats"] = {"thread_count": thread_count, "doc_count": res_info.count}
            enhanced.append(ws)
        return enhanced

    @staticmethod
    async def create(name: str, description: Optional[str] = None) -> Dict:
        db = mongodb_manager.get_async_database()
        new_ws = {"id": str(uuid.uuid4())[:8], "name": name, "description": description}
        await db.workspaces.insert_one(new_ws)
        return new_ws

    @staticmethod
    async def update(workspace_id: str, data: Dict) -> Optional[Dict]:
        db = mongodb_manager.get_async_database()
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
            
        from qdrant_client.http import models as qmodels
        scroll_res = await qdrant.client.scroll(
            collection_name="knowledge_base",
            scroll_filter=qmodels.Filter(must=[qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=workspace_id))]),
            limit=100,
            with_payload=True
        )
        
        docs_map = {}
        for point in scroll_res[0]:
            name = point.payload.get("source", "Unknown")
            if name not in docs_map:
                docs_map[name] = {
                    "name": name,
                    "type": point.payload.get("type", "unknown"),
                    "created_at": point.payload.get("created_at")
                }
        
        ws["threads"] = threads
        ws["documents"] = list(docs_map.values())
        ws["stats"] = {"thread_count": len(threads), "doc_count": len(docs_map)}
        return ws

workspace_service = WorkspaceService()
