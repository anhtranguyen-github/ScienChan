from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from backend.app.services.document_service import document_service

router = APIRouter(tags=["documents"])

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), workspace_id: str = "default"):
    try:
        num_chunks = await document_service.upload(file, workspace_id)
        return {
            "status": "success", 
            "filename": file.filename, 
            "chunks": num_chunks,
            "message": f"Successfully processed {num_chunks} chunks."
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
    content = await document_service.get_content(name)
    if content is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"name": name, "content": content}

@router.delete("/documents/{name:path}")
async def delete_document(name: str, workspace_id: str = "default"):
    await document_service.delete(name, workspace_id)
    return {"status": "success", "message": f"Document {name} deleted."}

@router.get("/documents/{name:path}/inspect")
async def inspect_document(name: str):
    return await document_service.inspect(name)

@router.post("/documents/update-workspaces")
async def update_document_workspaces(request: Request):
    data = await request.json()
    name = data.get("name")
    target_workspace_id = data.get("target_workspace_id")
    action = data.get("action", "share")
    
    if not name or not target_workspace_id:
        raise HTTPException(status_code=400, detail="name and target_workspace_id are required")
        
    await document_service.update_workspaces(name, target_workspace_id, action)
    return {"status": "success", "message": f"Document {name} {action}ed successfully."}
