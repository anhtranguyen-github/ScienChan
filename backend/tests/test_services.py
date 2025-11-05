import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from backend.app.services.document_service import document_service
from backend.app.services.workspace_service import workspace_service

@pytest.mark.asyncio
async def test_document_service_list_all(mocker):
    # Mock Qdrant client scroll
    mock_point = MagicMock()
    mock_point.id = "test-id"
    mock_point.payload = {
        "source": "test.pdf",
        "extension": ".pdf",
        "workspace_id": "ws-1",
        "shared_with": []
    }
    
    mock_response = ([mock_point], None)
    mocker.patch("backend.app.rag.qdrant_provider.qdrant.client.scroll", return_value=mock_response)
    
    docs = await document_service.list_all()
    assert len(docs) == 1
    assert docs[0]["name"] == "test.pdf"
    assert docs[0]["chunks"] == 1

@pytest.mark.asyncio
async def test_workspace_service_create(mocker):
    # Mock MongoDB insert
    mock_db = MagicMock()
    mock_col = MagicMock()
    mock_col.insert_one = AsyncMock()
    # Handle both db.workspaces and db["workspaces"]
    mock_db.__getitem__.return_value = mock_col
    mock_db.workspaces = mock_col
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    
    ws = await workspace_service.create("New Workspace", "Description")
    assert ws["name"] == "New Workspace"
    assert len(ws["id"]) == 8
    mock_col.insert_one.assert_called_once()

@pytest.mark.asyncio
async def test_document_service_delete(mocker):
    mock_delete = mocker.patch("backend.app.rag.qdrant_provider.qdrant.delete_document", return_value=AsyncMock())
    await document_service.delete("test.pdf", "default")
    mock_delete.assert_called_once_with("knowledge_base", "test.pdf", workspace_id="default")
