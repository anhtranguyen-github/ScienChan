import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
    llm_provider: string;
    llm_model: string;
    embedding_provider: string;
    embedding_model: string;
    retrieval_mode: 'hybrid' | 'vector' | 'keyword';
    search_limit: number;
    hybrid_alpha: number;
    theme: string;
    show_reasoning: boolean;
}

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:8000/settings/');
            const data = await res.json();
            setSettings(data);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateSettings = async (updates: Partial<AppSettings>) => {
        try {
            const res = await fetch('http://localhost:8000/settings/', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const data = await res.json();
            setSettings(data);
            return data;
        } catch (err) {
            console.error('Failed to update settings:', err);
            throw err;
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, updateSettings, isLoading, refreshSettings: fetchSettings };
}
