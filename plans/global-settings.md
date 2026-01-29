# Plan: Global Settings and Configuration Management

## Objective
Provide a unified settings interface for configuring LLM providers, embedding models, retrieval modes, and application-wide parameters.

## Backend Changes
1.  **Settings Manager (`backend/app/core/settings_manager.py`)**:
    *   Implement as a singleton to load/save settings from `backend/data/settings.json`.
    *   Maintain a `AppSettings` Pydantic model.
    *   Default to `ai_settings` (env vars) if no JSON exists.
2.  **API Router (`backend/app/routers/settings.py`)**:
    *   `GET /settings`: Retrieve current global configuration.
    *   `PATCH /settings`: Update specific settings.
3.  **Integration**:
    *   **LLM Provider**: Update `get_llm()` to query `SettingsManager`.
    *   **Embedding Provider**: Update `get_embeddings()` to query `SettingsManager`.
    *   **Retrieval Logic**:
        *   Update `QdrantProvider.hybrid_search` to accept a `mode` parameter (fused, vector-only, keyword-only).
        *   Update `retrieval_node` to pass the configured mode.
4.  **Schema (`backend/app/core/schemas.py`)**:
    *   Define `AppSettings` model with fields for:
        *   `llm_provider`, `llm_model`
        *   `embedding_provider`, `embedding_model`
        *   `retrieval_mode` (enum: `hybrid`, `vector`, `keyword`)
        *   `search_limit` (top-k)

## Frontend Changes
1.  **Setting Store/Hook (`frontend/src/hooks/use-settings.ts`)**:
    *   Manage fetching and updating settings.
2.  **Settings UI (`frontend/src/components/settings-manager.tsx`)**:
    *   A modal with categories: "LLM & Models", "Retrieval & RAG", "System".
    *   Inputs for API keys (stored securely on backend/env or temporary session).
3.  **Sidebar Integration**:
    *   Add a "Settings" button with a cog icon.

## Implementation Steps
1.  **Backend**: Create schema and manager for JSON persistence.
2.  **Backend**: Create settings router and integrate into `main.py`.
3.  **Backend**: Refactor providers to use dynamic settings.
4.  **Frontend**: Build `SettingsManager` UI and hook.
5.  **QA**: Test switching from `hybrid` to `vector` search and verify retrieval differences.
