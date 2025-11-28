import { useState, useEffect, useCallback } from 'react';
import { API_ROUTES } from '@/lib/api-config';

export interface DocumentPoint {
    id: string;
    payload: any;
}

export interface Document {
    id: string;
    name: string;
    extension: string;
    workspace_id: string;
    shared_with: string[];
    chunks: number;
    status?: string;
    points: DocumentPoint[];
}

export function useDocuments() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDocuments = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch(API_ROUTES.DOCUMENTS_ALL);
            const data = await res.json();
            setDocuments(data);
        } catch (err) {
            console.error('Failed to fetch all documents:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const deleteDocument = async (name: string, workspaceId: string, vaultDelete: boolean = false) => {
        try {
            const url = new URL(API_ROUTES.DOCUMENT_DELETE(name));
            url.searchParams.append('workspace_id', workspaceId);
            url.searchParams.append('vault_delete', String(vaultDelete));
            const res = await fetch(url.toString(), {
                method: 'DELETE'
            });
            if (res.ok) {
                await fetchDocuments();
                return true;
            }
        } catch (err) {
            console.error('Failed to delete document:', err);
        }
        return false;
    };

    const updateWorkspaceAction = async (name: string, workspaceId: string, targetWorkspaceId: string, action: 'move' | 'share' | 'unshare', forceReindex: boolean = false) => {
        try {
            const res = await fetch(API_ROUTES.DOCUMENTS_UPDATE_WS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    workspace_id: workspaceId,
                    target_workspace_id: targetWorkspaceId,
                    action,
                    force_reindex: forceReindex
                })
            });
            if (res.ok) {
                await fetchDocuments();
                return { success: true };
            }
            if (res.status === 409) {
                const data = await res.json();
                return { success: false, conflict: true, error: data.detail };
            }
        } catch (err) {
            console.error(`Failed to ${action} document:`, err);
        }
        return { success: false };
    };

    const inspectDocument = async (name: string) => {
        try {
            const res = await fetch(`${API_ROUTES.DOCUMENTS}/${encodeURIComponent(name)}/inspect`);
            if (res.ok) {
                return await res.json();
            }
        } catch (err) {
            console.error('Failed to inspect document:', err);
        }
        return null;
    };

    return {
        documents,
        isLoading,
        refreshDocuments: fetchDocuments,
        deleteDocument,
        updateWorkspaceAction,
        inspectDocument
    };
}
