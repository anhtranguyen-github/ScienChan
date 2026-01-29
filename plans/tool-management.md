# Tool Management Implementation Plan

## Objective
Enable CRUD operations for tools, toggle functionality, and support for Custom/MCP tools.

## Backend
1.  **Persistence Layer**:
    -   File: `backend/data/tools.json`
    -   Structure: List of tool objects `{ id, name, type, enabled, config, description }`.

2.  **Tool Manager (`backend/app/tools/manager.py`)**:
    -   Manage the `tools.json` file.
    -   Provide methods to:
        -   List all tools (with status).
        -   Toggle tool status.
        -   Add new tools (Custom/MCP config).
        -   Delete tools.
        -   **Instantiate** LangChain tools based on config.

3.  **Update Registry (`backend/app/tools/registry.py`)**:
    -   Modify `get_tools()` to fetch *only enabled* tools from `ToolManager`.

4.  **API Endpoints (`backend/app/routers/tools.py`)**:
    -   `GET /tools`: List.
    -   `POST /tools`: Create.
    -   `PUT /tools/{id}`: Update (toggle).
    -   `DELETE /tools/{id}`: Delete.

## Frontend
1.  **Hook (`use-tools.ts`)**:
    -   Fetch tools, toggle, create, delete.
2.  **Component (`tools-manager.tsx`)**:
    -   List of tools with Toggle switches.
    -   "Add Tool" modal/form (Name, Description, Type, Config).
3.  **Integration**:
    -   Add "Tools" button to Sidebar.
    -   Display `ToolsManager` in a modal or drawer.

## Implementation Steps
1.  Create `backend/app/tools/manager.py`. (Handles JSON schema and Tool instantiation).
2.  Create `backend/app/routers/tools.py`.
3.  Update `backend/app/main.py` to include router.
4.  Refactor `backend/app/tools/registry.py`.
5.  Create Frontend `use-tools.ts`.
6.  Create Frontend Components.
7.  E2E Test.
