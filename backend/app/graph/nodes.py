import logging
from typing import Dict, List
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, RemoveMessage
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
    
    workspace_id = state.get("workspace_id", "default")
    
    # Use Search Strategy from settings
    results = await qdrant.hybrid_search(
        collection_name="knowledge_base", 
        query_vector=query_vector, 
        query_text=last_message,
        limit=settings.search_limit,
        mode=settings.retrieval_mode,
        alpha=settings.hybrid_alpha,
        workspace_id=workspace_id
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
        "reasoning_steps": ["Retrieved context from knowledge base"]
    }

from langchain_core.runnables import RunnableConfig

async def reason_node(state: AgentState, config: RunnableConfig) -> Dict:
    """Analyze context and decide next steps."""
    context_str = ""
    for s in state.get("sources", []):
        context_str += f"[{s['id']}] Source: {s['name']}\nContent: {s['content']}\n\n"
    
    logger.info(f"Context string for reasoning: {context_str[:200]}...")

    summary = state.get("summary", "")
    summary_context = f"\n\n--- PREVIOUS CONVERSATION SUMMARY ---\n{summary}" if summary else ""

    system_prompt = SystemMessage(content=(
        "You are an advanced reasoning assistant. Use the provided context and conversation summary to answer the user's question. "
        "If you need more information, you can use the available tools. "
        "\n\n--- CITATION RULES ---\n"
        "You MUST cite your sources using numeric brackets like [1], [2], etc., corresponding to the context blocks. "
        "Place citations at the end of the sentences they support. "
        "If multiple sources support a point, use [1][2]. "
        "\n\n--- REASONING OPTIMIZATION (NOWAIT) ---\n"
        "Be direct and efficient in your reasoning. Avoid unnecessary self-reflection tokens. "
        + summary_context +
        "\n\n--- CONTEXT ---\n" + context_str
    ))
    
    logger.info("Starting reasoning step...")
    messages = [system_prompt] + state["messages"]
    response = await llm_with_tools.ainvoke(messages, config=config)
    
    # Attach reasoning data to the message for history persistence
    current_steps = state.get("reasoning_steps", []) + ["Reasoning about the query and context"]
    response.additional_kwargs["reasoning_steps"] = current_steps
    response.additional_kwargs["sources"] = state.get("sources", [])
    
    logger.info(f"LLM Response: {response.content[:200]}...")
    
    if response.tool_calls:
        logger.info(f"Model decided to call tools: {len(response.tool_calls)} calls generated")
        for tc in response.tool_calls:
            logger.info(f"Tool call: {tc['name']}")
    else:
        logger.info("Model generated direct response")
    
    return {
        "messages": [response],
        "reasoning_steps": current_steps
    }

async def generate_node(state: AgentState) -> Dict:
    """Synthesize the final answer."""
    final_steps = state.get("reasoning_steps", []) + ["Synthesizing final response"]
    
    # Update the last assistant message with the final reasoning steps
    last_msg = state["messages"][-1]
    if isinstance(last_msg, AIMessage):
        # We create a new message object with the same ID to update the metadata
        updated_msg = AIMessage(
            content=last_msg.content,
            id=getattr(last_msg, "id", None),
            additional_kwargs={
                **last_msg.additional_kwargs,
                "reasoning_steps": final_steps
            }
        )
        return {
            "messages": [updated_msg],
            "reasoning_steps": final_steps
        }
        
    return {
        "reasoning_steps": final_steps
    }

async def summarize_node(state: AgentState) -> Dict:
    """Summarize the conversation history if it gets too long."""
    # Only summarize if we have more than a certain number of messages
    # We keep the last few messages for immediate context
    messages = state["messages"]
    if len(messages) <= 6:
        return {}
        
    logger.info(f"Summarizing conversation history ({len(messages)} messages)...")
    
    existing_summary = state.get("summary", "")
    if existing_summary:
        summary_prompt = (
            f"This is a summary of the conversation history so far: {existing_summary}\n\n"
            "Extend the summary by adding the new messages below. "
            "IMPORTANT: Preserve all specific facts, numbers, and user-provided details concisely."
        )
    else:
        summary_prompt = (
            "Summarize the following conversation history concisely. "
            "IMPORTANT: You MUST preserve all specific facts, numbers, and key details provided by the user."
        )
        
    # Get all messages except the last 2 (usually the current Q&A pair)
    messages_to_summarize = messages[:-2]
    
    response = await llm.ainvoke(
        [SystemMessage(content=summary_prompt)] + messages_to_summarize
    )
    
    new_summary = response.content
    
    # Create RemoveMessage instructions for the summarized messages
    # We remove everything except the last 2 messages
    delete_messages = [RemoveMessage(id=m.id) for m in messages_to_summarize if hasattr(m, "id")]
    
    deleted_ids = [m.id for m in delete_messages]
    logger.info(f"Summarization complete. Removing {len(delete_messages)} messages: {deleted_ids}")
    
    return {
        "summary": new_summary,
        "messages": delete_messages
    }
