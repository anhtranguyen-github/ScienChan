# Skills & Tools Management

## Concept
Skills are high-level capabilities (e.g., "Research", "Analysis"), while Tools are specific executable functions (e.g., "Google Search", "Solve Equation").

## Registry
The backend maintains a registry of available tools that can be bound to the LangGraph agent.

### Core Tools
| Tool Name | Description | Resource |
|-----------|-------------|----------|
| `web_search` | Search the internet for latest info | Tavily / Serper |
| `math_solver` | Execute Python code for calculations | Local Python REPL |
| `kb_retriever`| Retrieve info from local vector store | Qdrant |

## Tool Selection Logic (LangGraph)
1. **Decision**: The LLM analyzes the user prompt and session state.
2. **Call**: LLM returns a tool call request with specific arguments.
3. **Execution**: The `ToolNode` in LangGraph executes the function.
4. **Observation**: The output is fed back into the graph for the next reasoning step.

## Adding New Skills
To add a new skill:
1. Define the tool function with proper docstrings (schemas).
2. Register the tool in `backend/app/tools/registry.py`.
3. Update the `bind_tools()` call in the LangGraph initialization.
