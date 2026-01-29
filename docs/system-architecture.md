# System Architecture

## Overview
The application follows a decoupled monorepo architecture with a Next.js frontend and a FastAPI backend.

```mermaid
graph TD
    A[Next.js Frontend] -->|REST/SSE| B[FastAPI Backend]
    B --> C[LangGraph Orchestrator]
    C --> D[Qdrant Vector DB]
    C --> E[LLM Provider (OpenAI/Ollama)]
    C --> F[External Tools]
    B --> G[Database (History/State)]
```

## Components

### 1. Frontend (Next.js)
- **Framework**: Next.js 14+ (App Router).
- **Styling**: Tailwind CSS for a premium, responsive UI.
- **State Management**: React Hooks + Context/Zustand.
- **Communication**: SSE (Server-Sent Events) for real-time streaming.

### 2. Backend (FastAPI)
- **Framework**: FastAPI for high-performance Python ASYNC support.
- **Orchestration**: LangGraph to define stateful, cyclic AI workflows.
- **Vector Search**: Qdrant for semantic search and RAG.
- **Reasoning**: Integration with reasoning models and optimization techniques (NOWAIT).

### 3. Data Flow
1. User sends a message via the frontend.
2. FastAPI receives the request and triggers a LangGraph thread.
3. LangGraph nodes perform:
    - Intent classification.
    - Context retrieval (RAG).
    - Tool execution if necessary.
    - Response synthesis.
4. The response is streamed back to the user via SSE.

## Security
- API Key management via environment variables.
- CORS policy to restrict access to trusted origins.
- (Future) Auth integration with JWT/OAuth2.
