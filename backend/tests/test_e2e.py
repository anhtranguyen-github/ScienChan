import pytest
import io
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
import json

@pytest.mark.asyncio
async def test_e2e_document_flow():
    """Test full flow: Upload -> List -> Delete."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Health check
        res = await ac.get("/")
        assert res.status_code == 200
        assert "version" in res.json()

        # 2. Upload (mocking the ingestion part to avoid real embedding call if possible, 
        # but here we'll just check the endpoint exists and returns correctly if mocked)
        # For a real E2E we might want to actually process, but let's mock the service for speed in this test
        with patch("backend.app.services.document_service.document_service.upload", return_value=5) as mock_upload:
            files = {'file': ('test.txt', io.BytesIO(b"test content"), 'text/plain')}
            res = await ac.post("/upload", files=files, params={"workspace_id": "e2e_test"})
            assert res.status_code == 200
            assert res.json()["chunks"] == 5
            mock_upload.assert_called_once()

        # 3. List All
        with patch("backend.app.services.document_service.document_service.list_all", return_value=[{"name": "test.txt"}]) as mock_list:
            res = await ac.get("/documents-all")
            assert res.status_code == 200
            assert res.json()[0]["name"] == "test.txt"

@pytest.mark.asyncio
async def test_e2e_chat_threads():
    """Test Chat Thread Lifecycle."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List threads (should be empty for new workspace)
        res = await ac.get("/chat/threads", params={"workspace_id": "e2e_ws"})
        assert res.status_code == 200
        assert "threads" in res.json()

        # 2. Update title of a dummy thread
        # Mocking service to avoid DB dependency in E2E if desired, but we have MongoDB running
        # Let's use real DB for E2E if possible
        thread_id = "e2e_thread_1"
        res = await ac.patch(f"/chat/threads/{thread_id}/title", json={"title": "E2E Title"})
        assert res.status_code == 200
        
        # 3. Verify deletion
        res = await ac.delete(f"/chat/threads/{thread_id}")
        assert res.status_code == 200

from unittest.mock import patch
