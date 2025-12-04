import { useState, useEffect, useCallback } from 'react';
import { API_ROUTES } from '@/lib/api-config';
import { useError } from '@/context/error-context';

export interface Workspace {
    id: string;
    name: string;
    description?: string;
    stats?: {
        thread_count: number;
        doc_count: number;
    }
}

export interface WorkspaceDetail extends Workspace {
    threads: any[];
    documents: any[];
}

export function useWorkspaces() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showError } = useError();

    const fetchWorkspaces = useCallback(async () => {
        try {
            const res = await fetch(API_ROUTES.WORKSPACES);
            if (!res.ok) {
                const data = await res.json();
                showError("Database Sync Failed", data.detail || res.statusText, res.url);
                return;
            }
            const data = await res.json();
            setWorkspaces(data);

            const savedWsId = localStorage.getItem('currentWorkspaceId');
            const found = data.find((ws: Workspace) => ws.id === savedWsId);
            if (found) {
                setCurrentWorkspace(found);
            } else {
                // Primary fallback: look for 'default' workspace
                const defaultWs = data.find((ws: Workspace) => ws.id === 'default');
                if (defaultWs) {
                    setCurrentWorkspace(defaultWs);
                    localStorage.setItem('currentWorkspaceId', defaultWs.id);
                } else if (data.length > 0) {
                    // Secondary fallback: first available workspace
                    setCurrentWorkspace(data[0]);
                    localStorage.setItem('currentWorkspaceId', data[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch workspaces:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    const selectWorkspace = (ws: Workspace) => {
        setCurrentWorkspace(ws);
        localStorage.setItem('currentWorkspaceId', ws.id);
        window.location.reload();
    };

    const createWorkspace = async (payload: any) => {
        try {
            const res = await fetch(API_ROUTES.WORKSPACES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                await fetchWorkspaces();
                return { success: true };
            } else {
                const data = await res.json();
                showError("Construction Error", data.detail || 'Failed to create workspace', `Endpoint: ${res.url}`);
                return { success: false, error: data.detail || 'Failed to create workspace' };
            }
        } catch (err: any) {
            console.error('Failed to create workspace:', err);
            showError("Network Error", err.message || 'Connection to backend failed');
            return { success: false, error: 'Connection error' };
        }
    };

    const updateWorkspace = async (id: string, name: string, description?: string) => {
        try {
            const res = await fetch(API_ROUTES.WORKSPACE_DETAIL(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });
            if (res.ok) {
                await fetchWorkspaces();
            } else {
                const data = await res.json();
                showError("Modification Failed", data.detail || 'Failed to update workspace');
            }
        } catch (err: any) {
            showError("Network Error", err.message || 'Connection to backend failed');
            console.error('Failed to update workspace:', err);
        }
    };

    const deleteWorkspace = async (id: string, vaultDelete: boolean = false) => {
        try {
            const res = await fetch(`${API_ROUTES.WORKSPACE_DETAIL(id)}?vault_delete=${vaultDelete}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                if (currentWorkspace?.id === id) {
                    localStorage.removeItem('currentWorkspaceId');
                }
                await fetchWorkspaces();
            } else {
                const data = await res.json();
                showError("Deconstruction Error", data.detail || 'Failed to delete workspace');
            }
        } catch (err: any) {
            showError("Network Error", err.message || 'Connection to backend failed');
            console.error('Failed to delete workspace:', err);
        }
    };

    const getWorkspaceDetails = async (id: string): Promise<WorkspaceDetail | null> => {
        try {
            const res = await fetch(API_ROUTES.WORKSPACE_STATS(id));
            if (res.ok) {
                return await res.json();
            }
            return null;
        } catch (err) {
            console.error('Failed to fetch workspace details:', err);
            return null;
        }
    };

    const shareDocument = async (sourceName: string, targetWorkspaceId: string) => {
        if (!currentWorkspace) return;
        try {
            const res = await fetch(API_ROUTES.WORKSPACE_SHARE(currentWorkspace.id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_name: sourceName, target_workspace_id: targetWorkspaceId })
            });
            return res.ok;
        } catch (err) {
            console.error('Failed to share document:', err);
            return false;
        }
    };

    return {
        workspaces,
        currentWorkspace,
        isLoading,
        selectWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        getWorkspaceDetails,
        shareDocument,
        refreshWorkspaces: fetchWorkspaces
    };
}
