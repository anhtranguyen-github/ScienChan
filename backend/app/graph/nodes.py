import logging
from typing import Dict, List
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from backend.app.graph.state import AgentState
from backend.app.rag.qdrant_provider import qdrant
from backend.app.rag.rag_service import rag_service
from backend.app.tools.registry import get_tools
from backend.app.core.llm_provider import get_llm

# Initialize Logger
logger = logging.getLogger(__name__)

# Initialize LLM via provider factory
llm = get_llm()
llm_with_tools = llm.bind_tools(get_tools())

from backend.app.core.settings_manager import settings_manager

async def retrieval_node(state: AgentState) -> Dict:
    """Retrieve relevant context based on configured settings."""
    settings = settings_manager.get_settings()
    last_message = state["messages"][-1].content
    logger.info(f"Retrieving context ({settings.retrieval_mode}) for query: {last_message[:50]}...")
    query_vector = await rag_service.get_query_embedding(last_message)
    
    # Use Search Strategy from settings
    results = await qdrant.hybrid_search(
        collection_name="knowledge_base", 
        query_vector=query_vector, 
        query_text=last_message,
        limit=settings.search_limit,
        mode=settings.retrieval_mode,
        alpha=settings.hybrid_alpha
    )
    
    context = []
    sources = []
    for i, res in enumerate(results):
        text = res["payload"]["text"]
        source_name = res["payload"].get("source", "Unknown")
        context.append(text)
        sources.append({
            "id": i + 1,
            "name": source_name,
            "content": text
        })
        
    logger.info(f"Retrieved {len(context)} context chunks")
    
    return {
        "context": context,
        "sources": sources,
        "reasoning_steps": state.get("reasoning_steps", []) + ["Retrieved context from knowledge base"]
    }

from langchain_core.runnables import RunnableConfig

async def reason_node(state: AgentState, config: RunnableConfig) -> Dict:
    """Analyze context and decide next steps."""
    context_str = ""
    for s in state.get("sources", []):
        context_str += f"[{s['id']}] Source: {s['name']}\nContent: {s['content']}\n\n"
    
    logger.info(f"Context string for reasoning: {context_str[:200]}...")

    system_prompt = SystemMessage(content=(
        "You are an advanced reasoning assistant. Use the provided context to answer the user's question. "
        "If you need more information, you can use the available tools. "
        "\n\n--- CITATION RULES ---\n"
        "You MUST cite your sources using numeric brackets like [1], [2], etc., corresponding to the context blocks. "
        "Place citations at the end of the sentences they support. "
        "If multiple sources support a point, use [1][2]. "
        "\n\n--- REASONING OPTIMIZATION (NOWAIT) ---\n"
        "Be direct and efficient in your reasoning. Avoid unnecessary self-reflection tokens. "
        "\n\n--- CONTEXT ---\n" + context_str
    ))
    
    logger.info("Starting reasoning step...")
    messages = [system_prompt] + state["messages"]
    response = await llm_with_tools.ainvoke(messages, config=config)
    
    logger.info(f"LLM Response: {response.content[:200]}...")
    
    if response.tool_calls:
        logger.info(f"Model decided to call tools: {len(response.tool_calls)} calls generated")
        for tc in response.tool_calls:
            logger.info(f"Tool call: {tc['name']}")
    else:
        logger.info("Model generated direct response")
    
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
