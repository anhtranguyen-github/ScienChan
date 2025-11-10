'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { API_ROUTES } from '@/lib/api-config';
import { SourceViewer } from '@/components/source-viewer';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';

interface Document {
    name: string;
    extension: string;
    chunks: number;
    shared?: boolean;
}

interface KnowledgeBaseProps {
    workspaceId?: string;
    isSidebar?: boolean;
}

export function KnowledgeBase({ workspaceId = "default", isSidebar = false }: KnowledgeBaseProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeSource, setActiveSource] = useState<{ id: number; name: string; content: string } | null>(null);
    const [isViewing, setIsViewing] = useState(false);
    const [isSharing, setIsSharing] = useState<string | null>(null);
    const [shareTarget, setShareTarget] = useState('');

    const fetchDocuments = async () => {
        try {
            const res = await fetch(`${API_ROUTES.DOCUMENTS}?workspace_id=${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (err) {
            console.error('Failed to fetch documents', err);
        }
    };

    useEffect(() => {
        if (workspaceId) {
            fetchDocuments();
        }
    }, [workspaceId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        console.log("Uploading file:", file.name);

        try {
            const res = await fetch(`${API_ROUTES.UPLOAD}?workspace_id=${workspaceId}`, {
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
            const res = await fetch(`${API_ROUTES.DOCUMENT_DELETE(name)}?workspace_id=${workspaceId}`, {
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

    if (isSidebar) {
        return (
            <div className="flex flex-col gap-2 h-full overflow-hidden">
                <div className="flex items-center justify-between px-2">
                    <label className="cursor-pointer bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white px-3 py-1.5 rounded-lg transition-all border border-white/5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                        <Upload size={12} />
                        Upload
                        <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 px-1 custom-scrollbar">
                    {documents.map((doc) => (
                        <div
                            key={doc.name}
                            data-testid={`doc-item-${doc.name}`}
                            className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all"
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText size={14} className="text-gray-600 shrink-0" />
                                <span className="text-[11px] text-gray-400 truncate">{doc.name}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(doc.name)}
                                data-testid={`delete-doc-${doc.name}`}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {documents.length === 0 && !isUploading && (
                        <div className="text-[10px] text-gray-700 italic px-2">Empty</div>
                    )}
                </div>
            </div>
        );
    }

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
                        <React.Fragment key={doc.name}>
                            <div
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
                                    {!doc.shared && (
                                        <button
                                            onClick={() => setIsSharing(isSharing === doc.name ? null : doc.name)}
                                            className={cn(
                                                "p-2 transition-all opacity-0 group-hover:opacity-100",
                                                isSharing === doc.name ? "text-indigo-400" : "text-gray-500 hover:text-indigo-400"
                                            )}
                                            title="Share"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(doc.name)}
                                        data-testid={`delete-doc-${doc.name}`}
                                        className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {isSharing === doc.name && (
                                <div className="px-3 pb-3 pt-1 animate-in slide-in-from-top-1 duration-200">
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="Target Workspace ID"
                                            value={shareTarget}
                                            onChange={(e) => setShareTarget(e.target.value)}
                                            className="flex-1 bg-[#1a1a1e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 ring-indigo-500 outline-none"
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!shareTarget) return;
                                                const res = await fetch(API_ROUTES.WORKSPACE_SHARE(workspaceId), {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ source_name: doc.name, target_workspace_id: shareTarget })
                                                });
                                                if (res.ok) {
                                                    setIsSharing(null);
                                                    setShareTarget('');
                                                    alert(`Shared ${doc.name} with ${shareTarget}`);
                                                }
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 rounded-lg transition-all"
                                        >
                                            Share
                                        </button>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
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
