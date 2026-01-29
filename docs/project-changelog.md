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
  - **Multi-format Support**: Integrated `PyPDFLoader`, `Docx2txtLoader`, and `TextLoader` to handle PDF, Microsoft Word, Markdown, and TXT files.
  - **Validation**: Successfully tested end-to-end RAG and reasoning flow using research paper `2505.03574v1.pdf`.

- Phase 3: LangGraph Orchestration.
  - `AgentState` refinement with messages and context.
  - Core nodes: `retrieval`, `reasoning`, `generation`.
  - Conditional routing for tool execution.
  - Tool registry with `calculator` and `tavily_search`.

- Phase 4: Streaming API & Advanced RAG.
  - `POST /chat/stream` SSE endpoint with reasoning metadata.
  - `POST /upload`, `GET /documents`, and `DELETE /documents/{name}` endpoints.
  - NOWAIT reasoning optimization integration.

- Phase 5: Premium Frontend & Full Integration.
  - **Knowledge Base UI**: Sidebar component for multi-format upload/management.
  - **Thinking Blocks**: Real-time visibility into reasoning and tool steps.
  - **Glassmorphic UI**: Polished sidebar and chat bubbles with Framer Motion.
  - `useChat` hook with enhanced metadata parsing.
