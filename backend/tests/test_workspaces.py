import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.mongodb import mongodb_manager

# Force motor to recreate client if loop changes (simplified for tests)
def reset_mongo():
    mongodb_manager._async_client = None

@pytest.fixture(autouse=True)
def setup_teardown():
    reset_mongo()
    yield

@pytest.mark.asyncio
async def test_workspace_crud():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create
        res = await ac.post("/workspaces/", json={"name": "Test CRUD", "description": "Initial"})
        assert res.status_code == 200
        ws_id = res.json()["id"]
        
        # 2. Read (List)
        list_res = await ac.get("/workspaces/")
        assert any(ws["id"] == ws_id for ws in list_res.json())
        
        # 3. Update
        update_res = await ac.patch(f"/workspaces/{ws_id}", json={"name": "Updated Name", "description": "New Desc"})
        assert update_res.status_code == 200
        assert update_res.json()["name"] == "Updated Name"
        
        # 4. Delete
        del_res = await ac.delete(f"/workspaces/{ws_id}")
        assert del_res.status_code == 200
        
        # 5. Verify deleted
        list_res_after = await ac.get("/workspaces/")
        assert not any(ws["id"] == ws_id for ws in list_res_after.json())

@pytest.mark.asyncio
async def test_workspace_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create unique workspaces
        ws1_res = await ac.post("/workspaces/", json={"name": "WS 1"})
        ws1_id = ws1_res.json()["id"]
        
        ws2_res = await ac.post("/workspaces/", json={"name": "WS 2"})
        ws2_id = ws2_res.json()["id"]
        
        # Create a thread in WS 1 by manually inserting metadata
        db = mongodb_manager.get_async_database()
        thread_id = f"thread_{ws1_id}"
        
        await db["thread_metadata"].insert_one({
            "thread_id": thread_id,
            "workspace_id": ws1_id,
            "title": "Isolated Thread"
        })
        await db["checkpoints"].insert_one({
            "thread_id": thread_id,
            "checkpoint": {},
            "metadata": {}
        })
        
        # Verify isolation
        res1 = await ac.get(f"/chat/threads?workspace_id={ws1_id}")
        assert any(t["id"] == thread_id for t in res1.json()["threads"])
        
        res2 = await ac.get(f"/chat/threads?workspace_id={ws2_id}")
        assert not any(t["id"] == thread_id for t in res2.json()["threads"])

@pytest.mark.asyncio
async def test_document_listing_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ws1_id = (await ac.post("/workspaces/", json={"name": "Doc WS 1"})).json()["id"]
        
        # Listing should be empty for a new workspace
        res = await ac.get(f"/documents?workspace_id={ws1_id}")
        assert res.status_code == 200
        assert len(res.json()) == 0
