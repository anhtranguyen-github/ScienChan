'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { API_ROUTES } from '@/lib/api-config';
import { SourceViewer } from '@/components/source-viewer';
import { AnimatePresence } from 'framer-motion';

interface Document {
    name: string;
    extension: string;
    chunks: number;
}

export function KnowledgeBase() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeSource, setActiveSource] = useState<{ id: number; name: string; content: string } | null>(null);
    const [isViewing, setIsViewing] = useState(false);

    const fetchDocuments = async () => {
        try {
            const res = await fetch(API_ROUTES.DOCUMENTS);
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
        console.log("Uploading file:", file.name);

        try {
            const res = await fetch(API_ROUTES.UPLOAD, {
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
        console.log("Deleting document:", name);
        try {
            const res = await fetch(API_ROUTES.DOCUMENT_DELETE(name), {
                method: 'DELETE',
            });
            if (res.ok) {
                setDocuments((prev) => prev.filter((d) => d.name !== name));
            }
        } catch (err) {
            console.error('Failed to delete document', err);
        }
    };

    const handleView = async (name: string) => {
        setIsViewing(true);
        try {
            const res = await fetch(API_ROUTES.DOCUMENT_GET(name));
            if (res.ok) {
                const data = await res.json();
                setActiveSource({
                    id: 0,
                    name: data.name,
                    content: data.content
                });
            }
        } catch (err) {
            console.error('Failed to view document', err);
        } finally {
            setIsViewing(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4 glass-panel rounded-2xl h-full border border-white/10 overflow-hidden">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        Knowledge Base
                    </h3>
                    <label className="cursor-pointer bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-2 rounded-xl transition-all border border-white/5 active:scale-95 transition-all">
                        <Upload className="w-4 h-4" />
                        <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                    </label>
                </div>

                <Link
                    href="/knowledge"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-widest border border-indigo-500/20 transition-all group"
                >
                    <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    Manage Full Access
                </Link>
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
                            data-testid={`doc-item-${doc.name}`}
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
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleView(doc.name)}
                                    className="p-2 text-gray-500 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                                    disabled={isViewing}
                                >
                                    {isViewing && activeSource?.name === doc.name ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <FileText size={14} />
                                    )}
                                </button>
                                <button
                                    onClick={() => handleDelete(doc.name)}
                                    data-testid={`delete-doc-${doc.name}`}
                                    className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
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
            <AnimatePresence>
                {activeSource && (
                    <SourceViewer
                        source={activeSource}
                        onClose={() => setActiveSource(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
