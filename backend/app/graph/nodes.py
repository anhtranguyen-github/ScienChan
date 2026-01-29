from typing import Dict, List
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from backend.app.graph.state import AgentState
from backend.app.rag.qdrant_provider import qdrant
from backend.app.rag.rag_service import rag_service
from backend.app.tools.registry import get_tools
from backend.app.core.llm_provider import get_llm

# Initialize LLM via provider factory
llm = get_llm()
llm_with_tools = llm.bind_tools(get_tools())

async def retrieval_node(state: AgentState) -> Dict:
    """Retrieve relevant context using Hybrid Search (Vector + Keyword)."""
    last_message = state["messages"][-1].content
    query_vector = await rag_service.get_query_embedding(last_message)
    
    # Use Hybrid Search for better recall
    results = await qdrant.hybrid_search(
        collection_name="knowledge_base", 
        query_vector=query_vector, 
        query_text=last_message,
        limit=5
    )
    context = [res["payload"]["text"] for res in results]
    
    return {
        "context": context,
        "reasoning_steps": state.get("reasoning_steps", []) + ["Retrieved context from knowledge base"]
    }

async def reason_node(state: AgentState) -> Dict:
    """Analyze context and decide next steps."""
    system_prompt = SystemMessage(content=(
        "You are an advanced reasoning assistant. Use the provided context to answer the user's question. "
        "If you need more information, you can use the available tools. "
        "\n\n--- REASONING OPTIMIZATION (NOWAIT) ---\n"
        "Be direct and efficient in your reasoning. Avoid unnecessary self-reflection tokens like 'Wait', 'Hmm', 'Alternatively', "
        "or 'Let me double check'. Only perform verification when absolutely necessary for accuracy. "
        "\n\nContext: " + "\n---\n".join(state.get("context", []))
    ))
    
    messages = [system_prompt] + state["messages"]
    response = await llm_with_tools.ainvoke(messages)
    
    return {
        "messages": [response],
        "reasoning_steps": state.get("reasoning_steps", []) + ["Reasoning about the query and context"]
    }

async def generate_node(state: AgentState) -> Dict:
    """Synthesize the final answer."""
    # This node is reached when no more tools are needed
    return {
        "reasoning_steps": state.get("reasoning_steps", []) + ["Synthesizing final response"]
    }
