from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from backend.app.graph.state import AgentState
from backend.app.graph.nodes import retrieval_node, reason_node, generate_node
from backend.app.tools.registry import get_tools

# 1. Initialize Graph
workflow = StateGraph(AgentState)

# 2. Add Nodes
workflow.add_node("retrieve", retrieval_node)
workflow.add_node("reason", reason_node)
workflow.add_node("tools", ToolNode(get_tools()))
workflow.add_node("generate", generate_node)

# 3. Define Edges
workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "reason")

def should_continue(state: AgentState):
    """Router to decide between tools and final generation."""
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return "generate"

workflow.add_conditional_edges(
    "reason",
    should_continue,
    {
        "tools": "tools",
        "generate": "generate"
    }
)

workflow.add_edge("tools", "reason")
workflow.add_edge("generate", END)

# 4. Compile
app = workflow.compile()
