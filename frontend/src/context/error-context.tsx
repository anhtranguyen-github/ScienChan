'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ErrorModal } from '@/components/error-modal';

interface ErrorContextType {
    showError: (message: string, details?: string, title?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
    const [error, setError] = useState<{ message: string; details?: string; title?: string } | null>(null);

    const showError = useCallback((message: string, details?: string, title?: string) => {
        setError({ message, details, title });
    }, []);

    const hideError = useCallback(() => {
        setError(null);
    }, []);

    return (
        <ErrorContext.Provider value={{ showError }}>
            {children}
            <ErrorModal
                isOpen={!!error}
                onClose={hideError}
                message={error?.message || ''}
                details={error?.details}
                title={error?.title}
            />
        </ErrorContext.Provider>
    );
}

export function useError() {
    const context = useContext(ErrorContext);
    if (context === undefined) {
        throw new Error('useError must be used within an ErrorProvider');
    }
    return context;
}
