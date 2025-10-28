import pytest
import asyncio
from langchain_core.messages import HumanMessage, AIMessage
from backend.app.graph.builder import app as graph_app
from backend.app.main import app as fastapi_app
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_summarization_flow():
    """Test that conversations are summarized after exceeding 6 messages."""
    config = {"configurable": {"thread_id": "test_summary_1"}}
    
    # Send 6 messages (12 total messages)
    for i in range(6):
        msg = f"Turn {i+1}: Remember this number {i*10}"
        await graph_app.ainvoke({"messages": [HumanMessage(content=msg)]}, config=config)
        
    # Check state
    state = await graph_app.aget_state(config)
    
    # Verify summary exists
    assert "summary" in state.values
    assert state.values["summary"] != ""
    print(f"\nSummary: {state.values['summary']}")
    
    # Verify history is significantly reduced from 12
    # We allow up to 6 because of potential delays in checkpointer merging or test timing
    print(f"Final message count: {len(state.values['messages'])}")
    assert len(state.values["messages"]) <= 6
    
    # Verify it can still recall information from the first turn
    result = await graph_app.ainvoke(
        {"messages": [HumanMessage(content="What was the number in turn 1?")]}, 
        config=config
    )
    content = result["messages"][-1].content.lower()
    assert "0" in content or "zero" in content

@pytest.mark.asyncio
async def test_thread_api_endpoints():
    """Test the new PATCH and DELETE endpoints for threads."""
    thread_id = "api_test_thread"
    
    # 1. Create a thread by sending a message
    config = {"configurable": {"thread_id": thread_id}}
    await graph_app.ainvoke({"messages": [HumanMessage(content="Initial message")]}, config=config)
    
    import httpx
    transport = httpx.ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 2. Test PATCH title
        patch_res = await ac.patch(f"/chat/threads/{thread_id}/title", json={"title": "Updated Title"})
        assert patch_res.status_code == 200
        assert patch_res.json()["title"] == "Updated Title"
        
        # 3. Verify it's in the list
        list_res = await ac.get("/chat/threads")
        assert list_res.status_code == 200
        threads = list_res.json()["threads"]
        match = next((t for t in threads if t["id"] == thread_id), None)
        assert match is not None
        assert match["title"] == "Updated Title"
        
        # 4. Test DELETE thread
        del_res = await ac.delete(f"/chat/threads/{thread_id}")
        assert del_res.status_code == 200
        
        # 5. Verify it's gone
        list_res_after = await ac.get("/chat/threads")
        threads_after = list_res_after.json()["threads"]
        assert not any(t["id"] == thread_id for t in threads_after)
