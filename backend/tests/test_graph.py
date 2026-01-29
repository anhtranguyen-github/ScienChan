import pytest
from langchain_core.messages import HumanMessage
from backend.app.graph.builder import app as graph_app

@pytest.mark.asyncio
async def test_graph_flow_simple():
    # Test a simple human message through the graph
    inputs = {"messages": [HumanMessage(content="Hello AI Architect")]}
    config = {"configurable": {"thread_id": "test_thread"}}
    
    # We use ainvoke for simple non-streaming test
    result = await graph_app.ainvoke(inputs, config=config)
    
    assert "messages" in result
    assert len(result["messages"]) > 1
    assert result["messages"][-1].content != ""

@pytest.mark.asyncio
async def test_persistence():
    config = {"configurable": {"thread_id": "persist_thread"}}
    
    # Send first message
    await graph_app.ainvoke({"messages": [HumanMessage(content="My name is Antigravity")]}, config=config)
    
    # Send second message asking for name
    result = await graph_app.ainvoke({"messages": [HumanMessage(content="What is my name?")]}, config=config)
    
    # The model should remember from history
    content = result["messages"][-1].content.lower()
    assert "antigravity" in content
