from typing import Annotated, TypedDict, List, Union
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    # The messages in the conversation
    messages: Annotated[List[BaseMessage], add_messages]
    
    # Retrieved context from RAG
    context: List[str]
    
    # Internal reasoning steps (for visibility)
    reasoning_steps: List[str]
    
    # Current tool call information if any
    current_tool_call: Union[str, None]
    
    # Verification result (if the answer is sufficient)
    is_sufficient: bool
    
    # Token usage or metadata
    metadata: dict
