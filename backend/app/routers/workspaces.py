import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from backend.app.core.mongodb import mongodb_manager
from backend.app.rag.qdrant_provider import qdrant

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

class WorkspaceStats(BaseModel):
    thread_count: int = 0
    doc_count: int = 0

class Workspace(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    stats: Optional[WorkspaceStats] = None

class WorkspaceDetail(Workspace):
    threads: List[dict] = []
    documents: List[dict] = []

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

@router.get("/", response_model=List[Workspace])
@router.get("", response_model=List[Workspace])
async def list_workspaces():
    db = mongodb_manager.get_async_database()
    cursor = db.workspaces.find()
    workspaces = await cursor.to_list(length=100)
    
    # Fetch stats for each workspace
    enhanced_workspaces = []
    for ws in workspaces:
        # Chat count
        thread_count = await db["thread_metadata"].count_documents({"workspace_id": ws["id"]})
        
        # Doc count
        from qdrant_client.http import models as qmodels
        doc_results = await qdrant.client.scroll(
            collection_name="knowledge_base",
            scroll_filter=qmodels.Filter(
                must=[qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=ws["id"]))]
            ),
            limit=1,
            with_payload=True,
            with_vectors=False
        )
        # This is a bit tricky for count in Qdrant scroll, but for now we'll just check if it has any or use a simple heuristic
        # Better way: use collection info or a count request if available in your client version
        res_info = await qdrant.client.count(
            collection_name="knowledge_base",
            count_filter=qmodels.Filter(
                must=[qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=ws["id"]))]
            )
        )
        doc_count = res_info.count
        
        ws["stats"] = {
            "thread_count": thread_count,
            "doc_count": doc_count
        }
        enhanced_workspaces.append(Workspace(**ws))
        
    return enhanced_workspaces

@router.post("/", response_model=Workspace)
@router.post("", response_model=Workspace)
async def create_workspace(ws: WorkspaceCreate):
    db = mongodb_manager.get_async_database()
    new_ws = {
        "id": str(uuid.uuid4())[:8],
        "name": ws.name,
        "description": ws.description
    }
    await db.workspaces.insert_one(new_ws)
    return Workspace(**new_ws)

@router.post("/{workspace_id}/share-document")
async def share_document(workspace_id: str, request: Request):
    """
    Share a document from one workspace with another.
    This updates the 'shared_with' field in Qdrant points.
    """
    data = await request.json()
    source_name = data.get("source_name")
    target_workspace_id = data.get("target_workspace_id")
    
    if not source_name or not target_workspace_id:
        raise HTTPException(status_code=400, detail="source_name and target_workspace_id are required")
        
    from qdrant_client.http import models as qmodels
    
    await qdrant.client.set_payload(
        collection_name="knowledge_base",
        payload={"shared_with": [target_workspace_id]},
        points=qmodels.Filter(
            must=[
                qmodels.FieldCondition(key="source", match=qmodels.MatchValue(value=source_name)),
                qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=workspace_id))
            ]
        )
    )
    
    return {"status": "success", "message": f"Document {source_name} shared with {target_workspace_id}"}

@router.patch("/{workspace_id}", response_model=Workspace)
@router.patch("/{workspace_id}/", response_model=Workspace)
async def update_workspace(workspace_id: str, ws: WorkspaceUpdate):
    db = mongodb_manager.get_async_database()
    update_data = {}
    if ws.name:
        update_data["name"] = ws.name
    if ws.description is not None:
        update_data["description"] = ws.description
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
        
    result = await db.workspaces.find_one_and_update(
        {"id": workspace_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    return Workspace(**result)

@router.delete("/{workspace_id}")
@router.delete("/{workspace_id}/")
async def delete_workspace(workspace_id: str):
    print(f"DEBUG: Attempting to delete workspace: {workspace_id}")
    if workspace_id == "default":
        raise HTTPException(status_code=400, detail="Cannot delete default workspace")
        
    db = mongodb_manager.get_async_database()
    
    # Check if exists
    exists = await db.workspaces.find_one({"id": workspace_id})
    print(f"DEBUG: Found workspace: {exists}")
    if not exists:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Delete workspace entity
    await db.workspaces.delete_one({"id": workspace_id})
    
    # Cleanup metadata
    await db["thread_metadata"].delete_many({"workspace_id": workspace_id})
    
    return {"status": "success", "message": f"Workspace {workspace_id} deleted"}

@router.get("/{workspace_id}/details", response_model=WorkspaceDetail)
async def get_workspace_details(workspace_id: str):
    db = mongodb_manager.get_async_database()
    ws = await db.workspaces.find_one({"id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Get Threads
    threads = await db["thread_metadata"].find({"workspace_id": workspace_id}).sort("last_active", -1).to_list(100)
    for t in threads:
        t["id"] = t.get("thread_id", str(t.get("_id", "")))
        if "_id" in t: del t["_id"]
        
    # Get Documents
    from qdrant_client.http import models as qmodels
    scroll_res = await qdrant.client.scroll(
        collection_name="knowledge_base",
        scroll_filter=qmodels.Filter(
            must=[qmodels.FieldCondition(key="workspace_id", match=qmodels.MatchValue(value=workspace_id))]
        ),
        limit=100,
        with_payload=True
    )
    
    # Extract unique documents by source name
    docs_map = {}
    for point in scroll_res[0]:
        name = point.payload.get("source", "Unknown")
        if name not in docs_map:
            docs_map[name] = {
                "name": name,
                "type": point.payload.get("type", "unknown"),
                "created_at": point.payload.get("created_at")
            }
            
    # Stats
    thread_count = len(threads)
    doc_count = len(docs_map)
    
    return WorkspaceDetail(
        **ws,
        stats={"thread_count": thread_count, "doc_count": doc_count},
        threads=threads,
        documents=list(docs_map.values())
    )
