import { useState, useCallback, useEffect } from 'react';
import { API_ROUTES } from '@/lib/api-config';

export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    type: 'system' | 'custom' | 'mcp';
    enabled: boolean;
    config?: Record<string, any>;
}

export function useTools() {
    const [tools, setTools] = useState<ToolDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTools = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_ROUTES.TOOLS);
            if (res.ok) {
                const data = await res.json();
                setTools(data);
            } else {
                throw new Error('Failed to fetch tools');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const toggleTool = useCallback(async (id: string, enabled: boolean) => {
        try {
            const res = await fetch(`${API_ROUTES.TOOL_TOGGLE(id)}?enabled=${enabled}`, {
                method: 'POST',
            });
            if (res.ok) {
                setTools(prev => prev.map(t => t.id === id ? { ...t, enabled } : t));
            }
        } catch (err) {
            console.error('Failed to toggle tool', err);
        }
    }, []);

    const addTool = useCallback(async (tool: ToolDefinition) => {
        try {
            const res = await fetch(API_ROUTES.TOOLS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tool),
            });
            if (res.ok) {
                await fetchTools();
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to add tool', err);
            return false;
        }
    }, [fetchTools]);

    const deleteTool = useCallback(async (id: string) => {
        try {
            const res = await fetch(`${API_ROUTES.TOOLS}${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setTools(prev => prev.filter(t => t.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete tool', err);
        }
    }, []);

    useEffect(() => {
        fetchTools();
    }, [fetchTools]);

    return {
        tools,
        isLoading,
        error,
        fetchTools,
        toggleTool,
        addTool,
        deleteTool
    };
}
