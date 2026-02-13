## [2026-02-13] - Documentation & Visual Identity Refinement

### Added
- **Visual Identity Update**: Refreshed all project screenshots (Dashboard, Chat, Vault, Document Management, Workspace Overview) to reflect the current UI state.
- **Admin Panel Showcase**: Added dedicated screenshots and documentation for the new Admin Console.
- **Operations & Monitoring Documentation**: Added a new section to `README.md` detailing the observability stack (Prometheus, Jaeger, OpenTelemetry) and the self-healing runner (`run.sh`).
- **Automated Capture Pipeline**: Updated Playwright-based screenshot script (`capture_features.spec.ts`) to automate visual asset regeneration.

### Changed
- **Requirements Update**: Corrected `docs/RPD.md` to reflect `pnpm` as the mandatory frontend package manager (removed outdated `bun` reference).
- **README Enhancement**: Integrated the Admin Console and Operations details into the primary project overview.

---

## [2026-02-13] - Feature: Centralized Admin Console & System Observability

### Added
- **Admin Console**: Implemented a comprehensive administrative control center with dashboard-style layout and sidebar navigation.
- **Neural Provider Management**: Dedicated page to configure and audit LLM and Embedding providers (OpenAI, Anthropic, Ollama, etc.) with real-time sync with the backend kernel.
- **Global Configuration Hub**: Interface for managing application-wide settings, search sensitivity (Hybrid Alpha), and UI behaviors.
- **Prometheus Metrics Dashboard**: Real-time visualization of system metrics (request latency, errors, active chat streams) directly from the Prometheus exporter.
- **Trace Explorer Integration**: Seamless link to Jaeger for distributed tracing analysis of RAG pipelines and reasoning chains.
- **Seamless Navigation**: Integrated "Admin Console" entry points in the primary workspace switcher and global headers.

### Changed
- **Hardcoding Elimination**: Removed hardcoded URLs and constants from the Admin Panel. 
    - Moved Jaeger and Prometheus URLs to `EXTERNAL_SERVICES` in `api-config.ts` with environment variable support.
    - Centralized provider-specific setting keys in `lib/constants.ts`.
    - Refactored `ProvidersPage` to dynamically fetch option lists (openai, ollama, etc.) from the backend metadata instead of using hardcoded arrays.
- **Backend Metadata Enhancement**: Updated the `SettingsManager` to expose allowed options for `Literal` setting types in the metadata API.

### Technical Notes
- **Next.js 15 App Router**: Leveraged layouts and sub-routes for modular admin page architecture.
- **Premium Aesthetics**: Used "Outfit" typography, dark-mode first design, Framer Motion for smooth state transitions, and high-contrast neural-themed accents.
- **Provider Sync**: Direct integration with the backend `SettingsManager` ensuring immediate application of non-core parameters.
- **Observability**: Implemented a raw Prometheus metric stream viewer with a partial parser for the "four golden signals".

### Edge Cases Handled
- ✅ **Observability Offline**: Implemented graceful fallbacks and error states if Prometheus or Jaeger services are unreachable.
- ✅ **Parameter Immutability**: Integrated schema metadata checks to prevent UI-level modification of core parameters (e.g., embedding dimensions) that require environment rebuilds.

## [2026-02-12] - Fix: Unified Response High-Reliability & Schema Alignment

### Fixed
- **AppResponse Schema Crash**: Fixed a `TypeError` on the backend where `success_response` was called without the required `data` argument, causing `500 Internal Server Error` and frontend fetch failures (specifically during workspace deletion).
- **Schema Resilience**: Updated `AppResponse` classmethods to explicitly handle `None` values and provide safe defaults for `code`, `message`, and `data`.
- **Error Handling Alignment**: Standardized `BaseAppException` handler in `main.py` to follow the `AppResponse` JSON contract (`success`, `code`, `message`, `data`), ensuring the frontend can consistently parse errors using the same Zod schemas as success responses.
- **API Audit**: Audited and standardized response paths in `tasks.py`, `tools.py`, and `documents.py` to use `AppResponse` factory methods instead of raw dicts or inconsistent field names (e.g., `detail/params`).

### Changed
- **Backend Constraints**: Updated `docs/constraints/backend-constraints.md` to mandate that all business-level exceptions must be caught and wrapped in a standard `AppResponse` structure by the global exception handler.

### Edge Cases Handled
- ✅ **Empty Success Responses**: Endpoints can now safely return "Success" messages without payload data without triggering Pydantic validation errors.
- ✅ **Frontend Fetch Resiliency**: Prevented browser-level "Failed to fetch" errors by ensuring the backend gracefully closes the request with a structured JSON error instead of crashing.


### Optimized
- **Workspace Listing**: Replaced N+1 query loop in `WorkspaceService.list_all` (N*2 queries) with a single MongoDB Aggregation Pipeline (`$lookup` + `$project`), reducing latency for workspace dashboards.
- **Workspace Deletion**: Implemented `StorageService.delete_many` to handle batch deletion of documents, replacing iterative `delete()` calls. This significantly reduces IO overhead during workspace cleanup.
- **Filename Collision Check**: Optimized `IngestionService` filename deduplication. Replaced iterative `while` loop (N queries) with a single Regex query to find the highest existing index.

### Refactored
- **Storage Service**: Added `delete_many` method for efficient batch operations.

### Documentation
- **Architecture**: Added `architecture/backend-modularization.md` detailing the service split.
- **Guides**: Added `guides/frontend-validation.md` (Zod) and `guides/performance-optimization.md` (N+1 fixes).
- **Index**: Updated `docs/INDEX.md` and `README.md` with new references.

## [2026-02-11] - Feature: Frontend Runtime Validation & Contract Enforcement

### Added
- **Zod Schema Library**: Created `frontend/src/lib/schemas/` to house backend-compatible schemas (`AppResponse`, `Workspace`, `Document`).
- **Runtime API Validation**: Refactored `useWorkspaces` hook to validate all incoming backend data using `zod.safeParse()` before application state updates.
- **Form Validation**: Integrated `react-hook-form` with `@hookform/resolvers/zod` for the "Create Workspace" form, enforcing constraints (e.g., name length) on the client side.
- **Standardized Backend Response**: Updated `GET /workspaces` endpoint to return a standardized `AppResponse` wrapper, aligning with backend constraints.

### Changed
- **Error Handling**: Replaced implicit type assumptions with explicit validation checks. API contract violations now trigger controlled UI errors instead of crashes.
- **Dependency**: Added `zod@3.24.1` and `react-hook-form` to frontend dependencies.

### Edge Cases Handled
- ✅ **Backend Schema Drift**: Frontend now gracefully handles unexpected API response structures without crashing.
- ✅ **Invalid Form Input**: Zod resolver prevents submission of invalid data before API call.

## [2026-02-11] - Refactor: Backend Service Modularization & Standardization

### Added
- **Modular Document Service**: Decomposed `DocumentService` (God Class) into `IngestionService`, `IndexingService`, `OrchestrationService`, `QueryService`, and `StorageService` for better maintainability and concern separation.
- **Service Facade**: Maintained `DocumentService` as a facade to ensure backward compatibility while migrating internal logic to dedicated modules.
- **Standardized Response Pattern**: Enforced `AppResponse` pattern across all document API endpoints for consistent error handling and successful data wrapping.
- **Early Validation**: Added pre-emptive checks for compatible RAG configurations before starting long-running background tasks.

### Changed
- **Constraint Updates**: Updated `backend-constraints.md` to mandate `AppResponse` usage and clarify file sizing limits (200 lines).
- **Naming Conventions**: formalized `snake_case` for Python and `kebab-case` for other files in development principles.

### Edge Cases Handled
- ✅ **Incompatible RAG Config**: Explicitly blocked moving/sharing documents between workspaces with different embedding models without a forced re-index.
- ✅ **Service Bloat**: Decomposed monolithic services to prevent future maintenance bottlenecks.

## [2026-02-10] - Feature: Intelligence Vault Refactor & Agentic Workflow Upgrade

### Added
- **Neutral Document Warehouse**: Refactored the "Intelligence Vault" to separate raw storage from RAG indexing. Documents are now stored initially in MinIO as "Vault Persistence" without performing expensive vector embedding.
- **On-Demand Neural Indexing**: Implemented lazy-loading for RAG ingestion. Vector indexing is now triggered only by explicit user interaction (Viewing a document or Moving/Sharing it to a workspace).
- **Manual Indexing Control**: Added a "Neural Indexing" (Zap) button in the UI for explicit manual control over the ingestion pipeline.
- **Proactive UI Synchronization**: Enhanced the frontend to automatically refresh and display document fragments/status immediately after on-demand neural indexing.
- **Strict Agentic Usage**: Implemented new `/master` and Git workflows enforcing **Atomic Commits**, **Full-Stack Sync**, and **Proactive Reasoning**.
- **`uv` Execution Engine**: Refactored `run.sh` to MANDATE the use of `uv` for backend execution, ensuring performance and environment consistency.

### Fixed
- **Vector Dimension Mismatch**: Resolved "Wrong input: Vector dimension error" by aligning Qdrant collection initialization and global settings to 1536 (OpenAI Contract).
- **Proactive Dimension Purge**: Expanded the document deletion service to proactively clear all potential vector dimensions (384-3072) to prevent stale data "hallucinations".
- **hallucination Prevention**: Removed hardcoded fallbacks to 1536 dim in the vector provider, replacing them with dynamic lookups to the global `SettingsManager`.

### Edge Cases Handled
- ✅ **Lazy Indexing**: Users can now view documents instantly after upload, even if indexing isn't triggered yet (fallback to raw storage read).
- ✅ **Dimension Elasticity**: System now correctly handles documents across multiple workspaces with different embedding configurations.

## [2026-02-10] - Feature: ArXiv Document Acquisition

### Added
- **ArXiv Integration**: Added ability to import research papers directly via ArXiv URLs or IDs (e.g., `1706.03762`).
- **Acquisition UI**: New "From ArXiv" button in the Workspace Documents page and Intelligence Vault with a dedicated import modal.
- **Backend Acquisition**: Integrated `arxiv` library into `DocumentService` for seamless paper downloading and automated metadata/safe-naming.
- **Task Tracking**: ArXiv acquisitions are tracked as ingestion tasks with "Neural Source Acquisition" status.

## [2026-02-10] - Bug Fix: Reasoning Engine Connection Resiliency
### Fixed
- **Root Cause**: `run.sh turbo` was skipping Ollama even when explicitly configured in `backend/data/settings.json`, and the backend lacked graceful error handling for unreachable providers.
- **Improved Runner**: `run.sh` now inspects `backend/data/settings.json` to ensure required local providers (Ollama/vLLM) are started even in turbo mode.
- **Graceful Error Handling**: Added try-except blocks in the reasoning graph nodes to catch connection errors and return a user-friendly message in the chat UI instead of crashing the SSE stream with "Connection to reasoning engine lost".
- **Priority Overrides**: Updated `SettingsManager` to prioritize environment variables (e.g., via `--llm` flags) over disk-based settings.

## [2026-02-10] - Improved Self-Healing Runner

### Added
- **Self-Healing Runner**: Updated `run.sh` with robust process killing (`pkill -9`) and automatic stale lock file detection for Next.js.
- **Force Clean Mode**: Added `--force-clean` flag to `run.sh` to explicitly wipe caches (`.next`, `__pycache__`, `.pytest_cache`) before starting.
- **Aggressive Process Termination**: Enhanced `kill_port` to handle stubborn zombie processes that `fuser` might miss.

### Fixed
- **Next.js Corruption**: Automated the resolution of "Failed to restore task data" errors by detecting and removing stale lock files.
- **Zombie Backend Processes**: Fixed issues where uvicorn workers survived backend termination.

### Edge Cases Handled
- ✅ **Frontend Cache Corruption**: Automatically detects and heals corrupted Turbopack databases.
- ✅ **Stale Lock Files**: Detects and removes `.next/dev/lock` if the process is no longer active.

## [2026-02-10] - DevOps Integration and Strict Operational Rules

### Added
- **Jenkins CI Pipeline**: Implemented a declarative `Jenkinsfile` with checkout, pytest, SonarQube, Checkov, and Docker build stages.
- **SonarQube Configuration**: Added `sonar-project.properties` for automated code quality analysis.
- **Strict Operational Rules**: Promoted project constraints to **STRICT RULES (R1-R7)** in the master workflow to ensure atomic actions and project stability.
- **R6: Mandatory Sync**: Mandated that `run.sh` and `README.md` must be updated after every workflow execution to keep the project runnable and documented.
- **Frontend CI/CD**: Integrated `pnpm`, `ESLint`, and `Vitest` into the Jenkins pipeline.
- **pnpm Migration**: Migrated frontend package management from `bun` to `pnpm` for better compatibility with standard DevOps tools.
- **CI/CD Constraints**: Created `docs/constraints/cicd-constraints.md` to enforce pipeline best practices.
- **Contract-First API**: Implemented OpenAPI spec generation (`backend/openapi.json`) and auto-generated TypeScript client for frontend.
- **Frontend Mocking**: Integrated MSW (Mock Service Worker) for testing without backend dependencies.

### Fixed
- **Docker Best Practices**: Modernized `Dockerfile` with standard `ENV key=value` format and optimized layers.
- **Test Stability**: Fixed flaky tests and hardcoded paths in `test_settings.py` and `WorkspaceService`.

### Edge Cases Handled
- ✅ **Infrastructure Consistency**: Ensured orchestration scripts stay in sync with service changes via Rule R6.
- ✅ **Operational Atomicitiy**: Enforced mandatory commits after verified test success via Rule R1.
- ✅ **Frontend Stability**: Verified frontend linting and unit tests pass with `pnpm`.

## [2026-02-10] - Runner Optimization and Streaming Stability

### Added
- **Turbo Mode**: Created a cloud-first runner logic in `run.sh` that skips local AI containers if cloud API keys are detected.
- **Modular Runner**: Refactored `run.sh` into subcommands (`infra`, `ai`, `backend`, `frontend`, `status`, `stop`, `clean`).
- **Enhanced Docker Infrastructure**: Improved `docker-compose.yml` with healthchecks, resource limits, logging caps, and better GPU offloading.

### Fixed
- **SSE Streaming**: Resolved "ERR_INCOMPLETE_CHUNKED_ENCODING" and network timeouts in chat streams by adding keep-alive headers and robust generator error handling.
- **Backend Crashes**: Fixed VENV pathing issues and missing dependencies in the runner script.
- **Frontend Crashes**: Fixed Next.js Turbopack permission issues by automating cache clearing.

### Edge Cases Handled
- ✅ **SSE Streaming Stability**: Implemented chunked encoding fixes and server-side keep-alive.
- ✅ **Environment Isolation**: Improved VENV handling in orchestration scripts.

## [2026-02-10] - Documentation Infrastructure Initialization

### Added
- Initialized `docs/` directory structure.
- Created `docs/INDEX.md` as the documentation entry point.
- Created `docs/RPD.md` defining project requirements and tech stack.
- Created `docs/DOC-SYNC.md` for documentation maintenance processes.
- Created `docs/EDGE-CASES.md` to track handled and partial edge cases.
- Created `docs/TEMPLATES.md` for standardized development plans.
- Created specialized constraint files in `docs/constraints/` (avoids, frontend, backend, testing, security).
- **New Constraint**: Mandated the use of `bun` for all frontend operations (install, run, test).

### Changed
- Consolidated `.gitignore` to use structured sections and refined path rules.
- Updated `.gitignore` to ignore the entire `.agent/` directory.

### Edge Cases Handled
- Added tracking for Large PDF, Empty Files, and Deduplication Collision edge cases.
