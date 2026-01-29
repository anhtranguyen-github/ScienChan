# Plan: Document Citations and Source Viewer

## Objective
Allow the chatbot to cite specific documents used in its reasoning and provide a way for users to view the source content in a modal.

## Backend Changes
1.  **Update `retrieval_node` (`backend/app/graph/nodes.py`)**:
    -   Modify the return structure to include `sources` (list of objects with `id`, `name`, `content`).
2.  **Update `reason_node` (`backend/app/graph/nodes.py`)**:
    -   Refine the system prompt to instruct the LLM to use numeric citations (e.g., `[1]`, `[2]`) corresponding to the provided context.
3.  **Update `stream_graph_updates` (`backend/app/main.py`)**:
    -   Extract the `sources` from the `retrieval` node output and stream them to the frontend via SSE as a new event type `sources`.

## Frontend Changes
1.  **Update `Message` Interface (`frontend/src/hooks/use-chat.ts`)**:
    -   Add `sources?: Array<{ id: number, name: string, content: string }>`.
2.  **Update `useChat` Hook**:
    -   Handle the `sources` SSE event and attach it to the current assistant message.
3.  **Rich Text Rendering**:
    -   Implement a parser in the chat message component to detect `[N]` patterns and render them as interactive citation badges.
4.  **Source Modal Component**:
    -   Create `SourceViewer` modal to show the document name and the specific chunk text.
5.  **Integration**:
    -   Clicking a citation badge opens the `SourceViewer`.

## Implementation Steps
1.  **Backend**: Modify `nodes.py` to return structured source data.
2.  **Backend**: Update `main.py` SSE stream logic.
3.  **Frontend**: Update hook and message types.
4.  **Frontend**: Create `SourceViewer` and badge components.
5.  **QA**: Verify citations appear and modals open.
