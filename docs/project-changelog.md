# Project Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Monorepo structure with `frontend/` (Next.js) and `backend/` (FastAPI).
- Comprehensive documentation: `use-cases.md`, `system-architecture.md`, `knowledge-base.md`, `skills-tools.md`.
- Implementation plan: `plans/chatbot-plan.md`.
- Backend skeleton with FastAPI, requirements, and LangGraph state.
- Frontend skeleton with Next.js 15, Tailwind CSS, and Lucide icons.
- Infrastructure: `docker-compose.yml` for Qdrant.
- Git initialization and `.gitignore`.
- Skill activation for `langgraph`, `rag-engineer`, `fastapi`, and `nowait-reasoning-optimizer`.

### Added
- Phase 2: Knowledge Base & RAG Engine.
  - `QdrantProvider` for vector search operations.
  - `RAGService` for text chunking and embedding generation.
  - `IngestionPipeline` for document processing.
  - **Advanced RAG**: Hybrid Search implementation using Reciprocal Rank Fusion (RRF).
  - **Flexible Providers**: Factored out LLM and Embedding providers to allow OpenAI, Anthropic, Voyage, and Local models via `llm_provider.py` and `embedding_provider.py`.

- Phase 3: LangGraph Orchestration.
  - `AgentState` refinement with messages and context.
  - Core nodes: `retrieval`, `reasoning`, `generation`.
  - Conditional routing for tool execution.
  - Tool registry with `calculator` and `tavily_search`.

- Phase 4: Streaming API.
  - `POST /chat/stream` SSE endpoint for real-time model updates.
  - `POST /upload` endpoint for knowledge base ingestion.
  - `astream_events` integration for granular state tracking.

- Phase 5: Premium Frontend & Polish.
  - Glassmorphic Sidebar and Chat Bubble design.
  - Framer Motion animations for message entry.
  - `useChat` hook with SSE support via `@microsoft/fetch-event-source`.
  - NOWAIT reasoning optimization via system prompt instructions.
  - Responsive design with Tailwind CSS.
