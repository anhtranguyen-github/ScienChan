from fastapi import APIRouter, HTTPException
from backend.app.services.task_service import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("/")
async def list_tasks(type: str = None):
    return {"tasks": task_service.list_tasks(type)}

@router.get("/{task_id}")
async def get_task_status(task_id: str):
    task = task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
