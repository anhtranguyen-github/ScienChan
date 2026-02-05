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
    async def create(data: Dict) -> Dict:
        db = mongodb_manager.get_async_database()
        
        name = data.get("name", "").strip()
        description = data.get("description")
        
        if not name:
            raise ValueError("Workspace name cannot be empty.")
            
        illegal_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '[', ']', '{', '}', '(', ')', ';', '&', '$', '#', '@', '!']
        if any(char in name for char in illegal_chars):
            raise ValueError(f"Workspace name contains illegal characters. Please use only letters, numbers, underscores, and hyphens.")

        # Check for duplicate name
        existing = await db.workspaces.find_one({"name": name})
        if existing:
            raise ValueError(f"Workspace with name '{name}' already exists.")
            
        ws_id = str(uuid.uuid4())[:8]
        new_ws = {"id": ws_id, "name": name, "description": description}
        await db.workspaces.insert_one(new_ws)

        # Initialize Workspace-Specific Fixed RAG Settings
        from backend.app.core.settings_manager import settings_manager
        rag_settings = {
            "rag_engine": data.get("rag_engine", "basic"),
            "embedding_provider": data.get("embedding_provider", "openai"),
            "embedding_model": data.get("embedding_model", "text-embedding-3-small"),
            "embedding_dim": data.get("embedding_dim", 1536),
            "chunk_size": data.get("chunk_size", 800),
            "chunk_overlap": data.get("chunk_overlap", 150),
            "neo4j_uri": data.get("neo4j_uri"),
            "neo4j_user": data.get("neo4j_user"),
            "neo4j_password": data.get("neo4j_password"),
        }
        await settings_manager.update_settings(rag_settings, workspace_id=ws_id)
        
        return new_ws

    @staticmethod
    async def ensure_default_workspace():
        """Ensure the 'default' workspace exists in MongoDB."""
        db = mongodb_manager.get_async_database()
        existing = await db.workspaces.find_one({"id": "default"})
        if not existing:
            new_ws = {
                "id": "default", 
                "name": "Default Workspace", 
                "description": "The system fallback workspace. Cannot be deleted or edited."
            }
            await db.workspaces.insert_one(new_ws)
            
            # Initialize default settings if missing
            from backend.app.core.settings_manager import settings_manager
            await settings_manager.get_settings("default")
            
        return existing or new_ws

    @staticmethod
    async def update(workspace_id: str, data: Dict) -> Optional[Dict]:
        if workspace_id == "default":
            raise ValueError("The 'default' workspace is a system fallback and cannot be edited.")
            
        db = mongodb_manager.get_async_database()

        # Enforce Immutability of RAG Engine
        if "rag_engine" in data:
            del data["rag_engine"]
        
        if "name" in data:
            new_name = data["name"].strip()
            if not new_name:
                raise ValueError("Workspace name cannot be empty.")
            illegal_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '[', ']', '{', '}', '(', ')', ';', '&', '$', '#', '@', '!']
            if any(char in new_name for char in illegal_chars):
                raise ValueError(f"Workspace name contains invalid characters. Please use only letters, numbers, underscores, and hyphens.")
            
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
    async def delete(workspace_id: str, vault_delete: bool = False):
        if workspace_id == "default":
            raise ValueError("The 'default' workspace is a system fallback and cannot be deleted.")
            
        db = mongodb_manager.get_async_database()
        
        # 1. Handle associated documents
        # Fetch docs owned by or shared with this workspace
        owned_docs = await db.documents.find({"workspace_id": workspace_id}).to_list(1000)
        shared_docs = await db.documents.find({"shared_with": workspace_id}).to_list(1000)
        
        from backend.app.services.document_service import document_service
        # For owned docs, apply chosen vault_delete logic
        for doc in owned_docs:
            await document_service.delete(doc["filename"], workspace_id, vault_delete=vault_delete)
            
        # For shared docs, we just remove the share association regardless
        for doc in shared_docs:
            await document_service.delete(doc["filename"], workspace_id, vault_delete=False)

        # 2. Cleanup workspace meta
        await db.workspaces.delete_one({"id": workspace_id})
        await db["workspace_settings"].delete_one({"workspace_id": workspace_id})
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

    @staticmethod
    async def get_graph_data(workspace_id: str) -> Dict:
        """Generate a semantic graph of documents within a workspace."""
        centroids = await qdrant.get_document_centroids(workspace_id)
        
        nodes = []
        for doc_id, data in centroids.items():
            nodes.append({
                "id": doc_id,
                "name": data["name"],
                "val": 10,
                "type": "document"
            })
            
        import numpy as np
        edges = []
        doc_ids = list(centroids.keys())
        
        # O(N^2) but N is small for a workspace
        for i in range(len(doc_ids)):
            for j in range(i + 1, len(doc_ids)):
                id1, id2 = doc_ids[i], doc_ids[j]
                v1 = np.array(centroids[id1]["vector"])
                v2 = np.array(centroids[id2]["vector"])
                
                # Cosine similarity
                sim = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
                
                if sim > 0.75: # Moderate similarity threshold for graph visualization
                    edges.append({
                        "source": id1,
                        "target": id2,
                        "value": float(sim),
                        "distance": float(1.0 - sim) # Used for layout distance
                    })
        
        return {"nodes": nodes, "edges": edges}

workspace_service = WorkspaceService()
