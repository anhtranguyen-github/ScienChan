from fastapi import APIRouter, Query
from typing import Optional
from backend.app.services.search_service import search_service

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/")
async def global_search(
    q: str = Query(..., min_length=2, description="Search query"),
    workspace_id: Optional[str] = Query(None, description="Optional workspace scope")
):
    """
    Perform a unified search across all architectural entities.
    """
    return await search_service.global_search(q, workspace_id)
