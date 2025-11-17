import { useState, useCallback, useEffect } from 'react';
import { API_ROUTES } from '@/lib/api-config';

export interface Thread {
    id: string;
    title: string;
    has_thinking?: boolean;
}

export function useThreads(workspaceId: string = "default") {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchThreads = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_ROUTES.CHAT_THREADS}?workspace_id=${encodeURIComponent(workspaceId)}`);
            if (res.ok) {
                const data = await res.json();
                setThreads(data.threads || []);
            }
        } catch (err) {
            console.error('Failed to fetch threads:', err);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    const updateThreadTitle = async (id: string, title: string) => {
        try {
            const res = await fetch(API_ROUTES.THREAD_TITLE(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            if (res.ok) {
                await fetchThreads();
            }
        } catch (err) {
            console.error('Failed to update thread title:', err);
        }
    };

    const deleteThread = async (id: string) => {
        try {
            const res = await fetch(API_ROUTES.THREAD_DELETE(id), {
                method: 'DELETE'
            });
            if (res.ok) {
                await fetchThreads();
            }
        } catch (err) {
            console.error('Failed to delete thread:', err);
        }
    };

    useEffect(() => {
        fetchThreads();
    }, [fetchThreads]);

    return {
        threads,
        isLoading,
        refreshThreads: fetchThreads,
        updateThreadTitle,
        deleteThread
    };
}
