const getApiBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ROUTES = {
    CHAT_STREAM: `${API_BASE_URL}/chat/stream`,
    CHAT_HISTORY: (threadId: string) => `${API_BASE_URL}/chat/history/${threadId}`,
    CHAT_THREADS: `${API_BASE_URL}/chat/threads`,
    THREAD_TITLE: (threadId: string) => `${API_BASE_URL}/chat/threads/${threadId}/title`,
    THREAD_DELETE: (threadId: string) => `${API_BASE_URL}/chat/threads/${threadId}`,
    DOCUMENTS: `${API_BASE_URL}/documents`,
    DOCUMENT_GET: (name: string) => `${API_BASE_URL}/documents/${name}`,
    DOCUMENT_DELETE: (name: string) => `${API_BASE_URL}/documents/${name}`,
    UPLOAD: `${API_BASE_URL}/upload`,
    SETTINGS: `${API_BASE_URL}/settings/`,
    TOOLS: `${API_BASE_URL}/tools/`,
    TOOL_TOGGLE: (id: string) => `${API_BASE_URL}/tools/${id}/toggle`,
    WORKSPACES: `${API_BASE_URL}/workspaces`,
    WORKSPACE_DETAIL: (id: string) => `${API_BASE_URL}/workspaces/${id}`,
    WORKSPACE_STATS: (id: string) => `${API_BASE_URL}/workspaces/${id}/details`,
    WORKSPACE_SHARE: (id: string) => `${API_BASE_URL}/workspaces/${id}/share-document`,
};
