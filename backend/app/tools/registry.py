from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.tools import tool
import os

@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression safely."""
    try:
        # Use a safe eval or a math library
        return str(eval(expression, {"__builtins__": None}, {}))
    except Exception as e:
        return f"Error: {str(e)}"

# Initialize Tavily search if key is present
tavily_search = None
if os.getenv("TAVILY_API_KEY"):
    tavily_search = TavilySearchResults(max_results=3)

# List of tools available to the agent
tools = [calculator]
if tavily_search:
    tools.append(tavily_search)

def get_tools():
    return tools
