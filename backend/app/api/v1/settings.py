from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from backend.app.core.schemas import AppSettings
from backend.app.core.settings_manager import settings_manager

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/", response_model=AppSettings)
async def get_settings():
    """Get current application settings."""
    return settings_manager.get_settings()

@router.patch("/", response_model=AppSettings)
async def update_settings(updates: Dict[str, Any]):
    """Update application settings."""
    try:
        return settings_manager.update_settings(updates)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
