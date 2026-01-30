import { useState, useCallback, useEffect } from 'react';
import { API_ROUTES } from '@/lib/api-config';

export interface Thread {
    id: string;
    title: string;
    has_thinking?: boolean;
}

export function useThreads() {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchThreads = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_ROUTES.CHAT_THREADS);
            if (res.ok) {
                const data = await res.json();
                setThreads(data.threads || []);
            }
        } catch (err) {
            console.error('Failed to fetch threads:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchThreads();
    }, [fetchThreads]);

    return { threads, isLoading, refreshThreads: fetchThreads };
}
