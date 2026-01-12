from fastapi import APIRouter, Request, UploadFile, File, HTTPException, BackgroundTasks
from backend.app.services.document_service import document_service

router = APIRouter(tags=["documents"])

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    workspace_id: str = "default"
):
    try:
        task_id, content, filename, content_type = await document_service.upload(file, workspace_id)
        
        # Dispatch background task
        background_tasks.add_task(
            document_service.run_ingestion,
            task_id, filename, content, content_type, workspace_id
        )
        
        return {
            "status": "pending", 
            "task_id": task_id,
            "message": "Ingestion started in background."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def list_documents(workspace_id: str = "default"):
    return await document_service.list_by_workspace(workspace_id)

@router.get("/documents-all")
async def list_all_documents():
    return await document_service.list_all()

@router.get("/documents/{name:path}")
async def get_document(name: str):
    doc = await document_service.get_by_id_or_name(name)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    content = await document_service.get_content(name)
    doc["content"] = content
    return doc

@router.delete("/documents/{name:path}")
async def delete_document(name: str, workspace_id: str = "default", vault_delete: bool = False):
    await document_service.delete(name, workspace_id, vault_delete=vault_delete)
    return {"status": "success", "message": f"Document {name} deleted."}

@router.get("/documents/{name:path}/chunks")
async def get_document_chunks(name: str, limit: int = 100):
    return await document_service.get_chunks(name, limit=limit)

@router.get("/documents/{name:path}/inspect")
async def inspect_document(name: str):
    return await document_service.inspect(name)

@router.post("/documents/update-workspaces")
async def update_document_workspaces(request: Request):
    data = await request.json()
    name = data.get("name")
    target_workspace_id = data.get("target_workspace_id")
    action = data.get("action", "share")
    force_reindex = data.get("force_reindex", False)
    
    if not name or not target_workspace_id:
        raise HTTPException(status_code=400, detail="name and target_workspace_id are required")
        
    try:
        await document_service.update_workspaces(name, target_workspace_id, action, force_reindex=force_reindex)
    except ValueError as e:
        if "Incompatible Workspace" in str(e):
             raise HTTPException(status_code=409, detail=str(e)) # 409 Conflict for mismatch
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "success", "message": f"Document {name} {action}ed successfully."}
