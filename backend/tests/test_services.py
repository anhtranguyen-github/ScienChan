import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from backend.app.services.document_service import document_service
from backend.app.services.workspace_service import workspace_service
import io

@pytest.mark.asyncio
async def test_document_service_list_all(mocker):
    # Mock MongoDB find
    mock_db = MagicMock()
    mock_col = MagicMock()
    
    mock_doc = {
        "_id": "69819596c9069bc9f72d0f88",
        "id": "test-id",
        "workspace_id": "ws-1",
        "filename": "test.pdf",
        "extension": ".pdf",
        "minio_path": "ws-1/test-id/v1/test.pdf",
        "status": "indexed",
        "chunks": 1,
        "shared_with": []
    }
    
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[mock_doc])
    mock_col.find.return_value = mock_cursor
    
    # Handle both db.documents and db["documents"]
    mock_db.__getitem__.return_value = mock_col
    mock_db.documents = mock_col
    
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    
    docs = await document_service.list_all()
    assert len(docs) == 1
    assert docs[0]["filename"] == "test.pdf"
    assert docs[0]["chunks"] == 1
    assert docs[0]["_id"] == "69819596c9069bc9f72d0f88"

@pytest.mark.asyncio
async def test_workspace_service_create(mocker):
    # Mock MongoDB
    mock_db = MagicMock()
    mock_col = MagicMock()
    
    # find_one returns None (no duplicate)
    mock_col.find_one = AsyncMock(return_value=None)
    mock_col.insert_one = AsyncMock()
    
    mock_db.__getitem__.return_value = mock_col
    mock_db.workspaces = mock_col
    
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    
    ws = await workspace_service.create("New Workspace", "Description")
    assert ws["name"] == "New Workspace"
    assert len(ws["id"]) == 8
    mock_col.insert_one.assert_called_once()

@pytest.mark.asyncio
async def test_document_service_delete(mocker):
    # Mock MongoDB and MinIO and Qdrant
    mock_db = MagicMock()
    mock_col = MagicMock()
    
    mock_doc = {
        "id": "doc-123",
        "minio_path": "ws/doc/v1/test.pdf"
    }
    mock_col.find_one = AsyncMock(return_value=mock_doc)
    mock_col.delete_one = AsyncMock()
    
    mock_db.__getitem__.return_value = mock_col
    mock_db.documents = mock_col
    
    mocker.patch("backend.app.core.mongodb.mongodb_manager.get_async_database", return_value=mock_db)
    mock_minio = mocker.patch("backend.app.services.document_service.minio_manager.delete_file")
    mock_qdrant = mocker.patch("backend.app.services.document_service.qdrant.delete_document", new_callable=AsyncMock)
    
    await document_service.delete("test.pdf", "default")
    
    mock_minio.assert_called_once_with("ws/doc/v1/test.pdf")
    mock_col.delete_one.assert_called_once_with({"id": "doc-123"})
    mock_qdrant.assert_called_once_with("knowledge_base", "test.pdf", workspace_id="default")
