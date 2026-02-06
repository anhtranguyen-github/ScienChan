import uuid
from typing import Dict, Any, Optional
from datetime import datetime

class TaskService:
    def __init__(self):
        # In-memory store for simplicity, but could be MongoDB
        self.tasks: Dict[str, Dict[str, Any]] = {}

    def create_task(self, type: str, metadata: Dict = None) -> str:
        task_id = str(uuid.uuid4())
        self.tasks[task_id] = {
            "id": task_id,
            "type": type,
            "status": "pending",
            "progress": 0,
            "message": "Initializing...",
            "error_code": None,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        return task_id

    def update_task(self, task_id: str, status: str = None, progress: int = None, message: str = None, error_code: str = None, metadata: Dict = None):
        if task_id not in self.tasks:
            return
        
        task = self.tasks[task_id]
        if status: task["status"] = status
        if progress is not None: task["progress"] = progress
        if message: task["message"] = message
        if error_code: task["error_code"] = error_code
        if metadata: task["metadata"].update(metadata)
        
        task["updated_at"] = datetime.utcnow().isoformat()

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        return self.tasks.get(task_id)

    def list_tasks(self, type: str = None) -> list:
        if type:
            return [t for t in self.tasks.values() if t["type"] == type]
        return list(self.tasks.values())

task_service = TaskService()
