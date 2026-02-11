# Performance Optimization Guide

## Core Concepts
This guide documents performance optimization strategies and anti-patterns resolved in the backend architecture.

## N+1 Query Resolution

### 1. Workspace Aggregation
**Issue**: `WorkspaceService.list_all` was executing `N+1` counts (N workspaces * 2 queries = ~200+ queries for 100 workspaces).
**Optimization**: Using a single MongoDB `$lookup` aggregation pipeline to fetch related document and thread counts per workspace in one query.

- **Lookups**: `documents` and `thread_metadata` collections.
- **Projection**: `$project` with `$size` aggregation.
- **Improvement**: Linear query performance (O(1) vs O(N)).

```python
pipeline = [
    { "$lookup": { "from": "documents", "localField": "id", "foreignField": "workspace_id", "as": "docs" } },
    { "$project": { ..., "stats": { "doc_count": { "$size": "$docs" } } } }
]
```

### 2. Batch Deletion (`StorageService`)
**Issue**: Workspace deletion was an **iterative** O(N) process, calling `delete_one` for each document, cascading to MinIO and Qdrant deletions.
**Optimization**: `delete_many` method performs batch operations:
- **MongoDB**: `delete_many()` / `update_many()`.
- **Qdrant**: Filter-based point deletion `qmodels.Filter(must=[...])`.
- **MinIO**: Still iterative (due to object storage nature) but optimized via async execution where possible (or handled by batching in future).

## Ingestion Optimization

### Filename Deduplication
**Issue**: `IngestionService` used a `while` loop (N queries) to prevent duplicates (File (1), File (2)...).
**Optimization**: Replaced with a **single Regex query** (`"^filename \(\d+\).ext$"`) to find all existing variations, parse the max index in-memory, and compute the next valid name.

- **Benefit**: Reduces duplicate check from O(N) DB calls to O(1) DB call + O(N) memory parse (extremely fast for filename strings).

## Future Directives
- Always prefer bulk operations (`insert_many`, `delete_many`) over loops.
- Use `$lookup` pipelines for related data fetching.
- Avoid synchronized IO blocks inside loops.
