# Backend Service Modularization

## Overview
As the `DocumentService` grew large, it was refactored into a modular architecture to improve maintainability, testability, and separation of concerns. This guide documents the new structure of `backend/app/services/document/`.

## Service Modules

### 1. IngestionService (`ingestion_service.py`)
- **Responsibility**: Handles file uploads, filename validation, duplicate detection, and initial storage in MinIO.
- **Key Methods**:
    - `upload(file, workspace_id, strategy)`: Validates and persists new files.
    - `upload_arxiv(arxiv_id, workspace_id, strategy)`: Downloads and processes arXiv papers.
    - `run_ingestion(task_id, ...)`: Background task for persistent storage logic.

### 2. IndexingService (`indexing_service.py`)
- **Responsibility**: Manages vector embedding, Qdrant interactions, and text chunking.
- **Key Methods**:
    - `index_document(doc_id, workspace_id, force)`: Main entry point for RAG indexing.
    - `_extract_text(doc)`: Internal logic for PDF parsing.
    - `_chunk_text(text)`: Splitting logic based on `chunk_size` / `chunk_overlap`.

### 3. OrchestrationService (`orchestration_service.py`)
- **Responsibility**: Coordinates cross-workspace operations and ensures RAG configuration consistency.
- **Key Methods**:
    - `update_document_workspaces(name, target_ws, action)`: Logic for Move, Share, and Link operations.
    - `run_workspace_op_background(...)`: Async wrapper for long-running moves.
    - **Validation**: Enforces strict checks on embedding model compatibility (e.g., cannot move a 1536d vector to a 768d workspace without re-indexing).

### 4. StorageService (`storage_service.py`)
- **Responsibility**: Low-level CRUD for document metadata and raw file access.
- **Key Methods**:
    - `get_content(name)`: Retrieves raw bytes from MinIO.
    - `delete(name, workspace_id)`: Singular deletion logic.
    - `delete_many(workspace_id)`: **Optimized** batch deletion for workspace cleanup.

### 5. QueryService (`query_service.py`)
- **Responsibility**: Read-only operations for listing and inspecting documents.
- **Key Methods**:
    - `list_by_workspace(ws_id)`: Fetches document list for UI.
    - `inspect(name)`: Returns debug metadata + vector stats.

## Facade Pattern
The `DocumentService` class remains in `backend/app/services/document/__init__.py` as a facade that inherits from all modular mixins. This preserves backward compatibility for existing consumers while enabling modular development.

```python
class DocumentService(
    IngestionService,
    IndexingService,
    OrchestrationService,
    QueryService,
    StorageService
):
    """Facade for document operations."""
    pass
```

## Anti-Patterns Avoided
- **God Class**: No single file exceeds 200 lines (mostly).
- **Circular Imports**: Imports are structured to avoid cycles. `document_service` instance is instantiated in `__init__`.
- **N+1 Queries**: `WorkspaceService` uses aggregation pipelines instead of loops for fetching related document stats.

## Future Extensions
- New capabilities (e.g., OCR, Graph RAG) should be implemented as new mixin services in `app/services/document/` and added to the facade.
