'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, CheckCircle, Loader2 } from 'lucide-react';

interface Document {
    name: string;
    extension: string;
    chunks: number;
}

export function KnowledgeBase() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDocuments = async () => {
        try {
            const res = await fetch('http://localhost:8000/documents');
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (err) {
            console.error('Failed to fetch documents', err);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8000/upload', {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                await fetchDocuments();
            } else {
                const data = await res.json();
                setError(data.detail || 'Upload failed');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (name: string) => {
        try {
            const res = await fetch(`http://localhost:8000/documents/${name}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setDocuments((prev) => prev.filter((d) => d.name !== name));
            }
        } catch (err) {
            console.error('Failed to delete document', err);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4 glass-panel rounded-2xl h-full border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    Knowledge Base
                </h3>
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95">
                    <Upload className="w-5 h-5" />
                    <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                </label>
            </div>

            {isUploading && (
                <div className="flex items-center gap-2 text-indigo-300 text-sm animate-pulse bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing document...
                </div>
            )}

            {error && (
                <div className="text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                    {error}
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {documents.length === 0 && !isUploading ? (
                    <div className="text-gray-400 text-sm italic text-center py-8">
                        No documents uploaded yet.
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div
                            key={doc.name}
                            className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all hover:bg-white/10"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                                    <FileText className="w-4 h-4 text-indigo-300" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium text-gray-200 truncate">{doc.name}</span>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{doc.chunks} fragments</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(doc.name)}
                                className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Hybrid Search Active
                </div>
            </div>
        </div>
    );
}
