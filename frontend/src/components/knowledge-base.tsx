'use client';

import React, { useState, useEffect } from 'react';
import {
    Upload, FileText, Trash2, CheckCircle, Loader2,
    ExternalLink, Database, Search, Share2, Eye,
    Plus, Filter, Shield, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { API_ROUTES } from '@/lib/api-config';
import { SourceViewer } from '@/components/source-viewer';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useError } from '@/context/error-context';

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
    const { showError } = useError();
    const [activeSource, setActiveSource] = useState<{ id: number; name: string; content: string } | null>(null);
    const [isViewing, setIsViewing] = useState(false);
    const [isSharing, setIsSharing] = useState<string | null>(null);
    const [shareTarget, setShareTarget] = useState('');
    const [activeTasks, setActiveTasks] = useState<any[]>([]);

    // Poll for active tasks
    useEffect(() => {
        const pollTasks = async () => {
            try {
                const res = await fetch(`${API_ROUTES.TASKS}?type=ingestion`);
                if (res.ok) {
                    const data = await res.json();
                    const pendingTasks = data.tasks.filter((t: any) =>
                        (t.status === 'pending' || t.status === 'processing') &&
                        t.metadata.workspace_id === workspaceId
                    );
                    setActiveTasks(pendingTasks);

                    // If any task just completed, refresh documents
                    const hasJustCompleted = data.tasks.some((t: any) => t.status === 'completed' && t.progress === 100);
                    if (hasJustCompleted) {
                        fetchDocuments();
                    }
                }
            } catch (err) {
                console.error('Task polling failed', err);
            }
        };

        const interval = setInterval(pollTasks, 2000);
        return () => clearInterval(interval);
    }, [workspaceId]);

    const fetchDocuments = async () => {
        try {
            const res = await fetch(`${API_ROUTES.DOCUMENTS}?workspace_id=${encodeURIComponent(workspaceId)}`);
            if (res.ok) {
                const data = await res.json();
                // Map backend properties to component interface
                const mappedDocs = data.map((doc: any) => ({
                    name: doc.filename,
                    extension: doc.extension,
                    chunks: doc.chunks,
                    shared: doc.workspace_id !== workspaceId
                }));
                setDocuments(mappedDocs);
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

        try {
            const res = await fetch(`${API_ROUTES.UPLOAD}?workspace_id=${encodeURIComponent(workspaceId)}`, {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                // Task is now handled by the polling effect
            } else {
                const data = await res.json();
                setError(data.detail || 'Upload failed');
                showError("Ingestion Rejected", data.detail || 'The document could not be processed.', `File: ${file.name}`);
            }
        } catch (err: any) {
            setError('Connection error');
            showError("Network Error", err.message || 'Failed to reach storage cluster.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (name: string) => {
        try {
            const res = await fetch(`${API_ROUTES.DOCUMENT_DELETE(name)}?workspace_id=${encodeURIComponent(workspaceId)}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setDocuments((prev) => prev.filter((d) => d.name !== name));
            } else {
                const data = await res.json();
                showError("Purge Failed", data.detail || 'Document deletion failed.', `Resource: ${name}`);
            }
        } catch (err: any) {
            console.error('Failed to delete document', err);
            showError("Network Error", err.message || 'Failed to complete deletion request.');
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
            } else {
                const data = await res.json();
                showError("Retrieval Failure", data.detail || 'Could not fetch document content.', `Source: ${name}`);
            }
        } catch (err: any) {
            console.error('Failed to view document', err);
            showError("Network Error", err.message || 'Connection to secondary index lost.');
        } finally {
            setIsViewing(false);
        }
    };

    if (isSidebar) {
        return (
            <div className="flex flex-col gap-3 h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-1 px-1 custom-scrollbar">
                    {documents.map((doc) => (
                        <div
                            key={doc.name}
                            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-all relative border border-transparent hover:border-white/5"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={14} className="text-gray-600 shrink-0 group-hover:text-indigo-400 transition-colors" />
                                <span className="text-[11px] text-gray-400 truncate font-medium">{doc.name}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(doc.name)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all active:scale-90"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {documents.length === 0 && !isUploading && (
                        <div className="flex flex-col items-center justify-center py-10 opacity-20">
                            <Database size={24} className="mb-2" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-center px-4 leading-relaxed">System Index Empty</span>
                        </div>
                    )}
                </div>

                <div className="px-1 py-4 mt-2">
                    <label className="cursor-pointer group flex items-center justify-center gap-3 h-10 w-full rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-dashed border-white/10 text-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                        <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                        Injest Source
                        <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                    </label>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-10 bg-[#121214] rounded-[2.5rem] h-full border border-white/10 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-30" />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-xl shadow-indigo-500/10">
                        <Database className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Intelligence Vault</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Neural Vector Index</span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span className="text-[10px] text-indigo-400 font-mono">{documents.length} ENTITIES</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <label className="cursor-pointer h-12 px-6 flex items-center gap-3 rounded-2xl bg-white hover:bg-white/90 text-black shadow-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest">
                        <Upload size={14} />
                        Upload
                        <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                    </label>
                </div>
            </div>

            {(isUploading || activeTasks.length > 0) && (
                <div className="space-y-3">
                    {activeTasks.map((task) => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-3 bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group"
                        >
                            <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500" />
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-white uppercase tracking-widest">{task.metadata.filename}</div>
                                        <div className="text-[9px] text-indigo-400/50 font-bold uppercase mt-0.5">{task.message}</div>
                                    </div>
                                </div>
                                <div className="text-[11px] font-black font-mono text-indigo-400">{task.progress}%</div>
                            </div>
                            <div className="w-full bg-white/[0.03] h-1.5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${task.progress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </motion.div>
                    ))}

                    {isUploading && activeTasks.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-4 bg-indigo-500/10 p-5 rounded-3xl border border-indigo-500/20"
                        >
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-wider mb-1">Streaming to Server...</div>
                                <div className="w-full bg-indigo-500/10 h-1 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-indigo-400"
                                        initial={{ width: "0%" }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {documents.length === 0 && !isUploading ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-20">
                            <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center mb-6">
                                <Search size={40} />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-2">Vault Empty</h4>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">No intelligence sources indexed</p>
                        </div>
                    ) : (
                        documents.map((doc, idx) => (
                            <motion.div
                                key={doc.name}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group flex items-center justify-between p-6 rounded-[2rem] bg-[#0a0a0b] border border-white/5 hover:border-indigo-500/30 transition-all hover:bg-white/[0.02]"
                            >
                                <div className="flex items-center gap-6 overflow-hidden">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/5 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                                        <FileText className="w-6 h-6 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-black text-white truncate max-w-[200px] uppercase tracking-tight">{doc.name}</span>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-mono text-gray-600 uppercase">{doc.extension.replace('.', '')}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-800" />
                                            <span className="text-[10px] text-indigo-400/50 font-black uppercase tracking-widest">{doc.chunks} Fragments</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleView(doc.name)}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-gray-500 hover:text-indigo-400 hover:bg-white/10 transition-all active:scale-90"
                                        title="View Content"
                                    >
                                        {isViewing && activeSource?.name === doc.name ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>

                                    {!doc.shared && (
                                        <button
                                            onClick={() => setIsSharing(isSharing === doc.name ? null : doc.name)}
                                            className={cn(
                                                "w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 relative",
                                                isSharing === doc.name ? "bg-indigo-600 text-white shadow-lg" : "bg-white/5 text-gray-500 hover:text-white"
                                            )}
                                            title="Share Access"
                                        >
                                            <Share2 size={18} />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleDelete(doc.name)}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                                        title="Purge Document"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                        <Shield className="w-3 h-3" />
                        Indexed
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-widest">
                        <Filter className="w-3 h-3" />
                        Hybrid Active
                    </div>
                </div>

                <Link
                    href="/"
                    className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 hover:text-indigo-400 transition-colors flex items-center gap-2 group"
                >
                    System Protocol v1.4
                    <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <AnimatePresence>
                {isSharing && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md z-[110]"
                    >
                        <div className="mx-4 p-8 bg-[#161619] border border-white/10 rounded-[2rem] shadow-2xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                                    <Share2 size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest">External Access Portal</h4>
                                    <p className="text-[10px] text-gray-500 font-medium">Grant permission to cross-pollinate data.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <input
                                    placeholder="Target ID (e.g. workspace-alpha)"
                                    value={shareTarget}
                                    onChange={(e) => setShareTarget(e.target.value)}
                                    className="flex-1 bg-[#0a0a0b] border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:ring-2 ring-indigo-500/20 outline-none placeholder:text-gray-700"
                                />
                                <button
                                    onClick={async () => {
                                        if (!shareTarget) return;
                                        const res = await fetch(API_ROUTES.WORKSPACE_SHARE(workspaceId), {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ source_name: isSharing, target_workspace_id: shareTarget })
                                        });
                                        if (res.ok) {
                                            setIsSharing(null);
                                            setShareTarget('');
                                            alert(`Permission Granted: ${isSharing} shared with ${shareTarget}`);
                                        }
                                    }}
                                    className="bg-white hover:bg-gray-100 text-black text-[10px] font-black px-8 rounded-2xl transition-all uppercase tracking-widest shadow-lg active:scale-95"
                                >
                                    Grant
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

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
