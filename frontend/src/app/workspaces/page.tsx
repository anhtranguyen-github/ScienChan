'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaces, Workspace, WorkspaceDetail } from '@/hooks/use-workspaces';
import {
    Layout, Plus, Trash2, Edit3, ChevronLeft,
    Database, MessageSquare, AlertCircle, X,
    Activity, FileText, ExternalLink, Clock, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkspacesPage() {
    const {
        workspaces, currentWorkspace, selectWorkspace,
        createWorkspace, updateWorkspace, deleteWorkspace, isLoading
    } = useWorkspaces();

    const router = useRouter();
    const [editingWs, setEditingWs] = useState<Workspace | null>(null);
    const [deletingWs, setDeletingWs] = useState<Workspace | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'id'>('name');

    // Fixed RAG Settings for new workspaces
    const [embeddingProvider, setEmbeddingProvider] = useState('openai');
    const [chunkSize, setChunkSize] = useState(800);
    const [chunkOverlap, setChunkOverlap] = useState(150);
    const [isVaultDeleteChecked, setIsVaultDeleteChecked] = useState(false);

    const filteredWorkspaces = workspaces
        .filter(ws =>
            ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ws.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ws.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return a.id.localeCompare(b.id);
        });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        if (editingWs) {
            await updateWorkspace(editingWs.id, name, description);
            setEditingWs(null);
            setIsCreating(false);
        } else {
            const embeddingDim = embeddingProvider === 'openai' ? 1536 : 768; // Local usually 768
            await createWorkspace({
                name,
                description,
                embedding_provider: embeddingProvider,
                embedding_model: embeddingProvider === 'openai' ? 'text-embedding-3-small' : 'sentence-transformers/all-mpnet-base-v2',
                embedding_dim: embeddingDim,
                chunk_size: chunkSize,
                chunk_overlap: chunkOverlap
            });
            setIsCreating(false);
        }
        setName('');
        setDescription('');
    };

    const startEdit = (ws: Workspace) => {
        setEditingWs(ws);
        setName(ws.name);
        setDescription(ws.description || '');
        setIsCreating(true);
    };

    const handleViewDetails = async (ws: Workspace) => {
        router.push(`/workspaces/${ws.id}`);
    };

    const cancelEdit = () => {
        setEditingWs(null);
        setIsCreating(false);
        setName('');
        setDescription('');
    };

    const isFormOpen = isCreating || editingWs;

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Background Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-6xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-6">
                        <a
                            href="/"
                            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95"
                        >
                            <ChevronLeft size={20} />
                        </a>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Workspace Management</h1>
                            <p className="text-gray-500 mt-1">Isolate your documents and conversations by project environment.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search environments..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#121214] border border-white/5 rounded-2xl pl-12 pr-6 py-3 w-64 focus:w-80 outline-none focus:ring-2 ring-indigo-500/20 transition-all placeholder:text-gray-700 text-sm"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-[#121214] border border-white/5 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 ring-indigo-500/20 transition-all text-gray-500"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="id">Sort by ID</option>
                        </select>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 whitespace-nowrap"
                        >
                            <Plus size={20} />
                            Create Workspace
                        </button>
                    </div>
                </div>

                {/* Workspaces List - Full Width */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full h-64 flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    ) : filteredWorkspaces.length === 0 ? (
                        <div className="col-span-full bg-[#121214] border border-white/10 rounded-[2rem] p-20 text-center">
                            <Layout size={64} className="mx-auto text-gray-700 mb-6" />
                            <h3 className="text-xl font-bold mb-2">No Matching Workspaces</h3>
                            <p className="text-gray-500">Your search "{searchTerm}" did not return any results.</p>
                        </div>
                    ) : (
                        filteredWorkspaces.map((ws) => (
                            <motion.div
                                layout
                                key={ws.id}
                                className={cn(
                                    "bg-[#121214] border rounded-3xl p-6 transition-all group relative",
                                    currentWorkspace?.id === ws.id
                                        ? "border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                                        : "border-white/5 hover:border-white/10"
                                )}
                            >
                                {currentWorkspace?.id === ws.id && (
                                    <div className="absolute top-6 right-6 px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-full border border-indigo-500/20">
                                        ACTIVE
                                    </div>
                                )}

                                <div className="flex items-start gap-5 mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-xl shadow-indigo-600/10">
                                        <Layout size={28} />
                                    </div>
                                    <div className="overflow-hidden pr-12">
                                        <h3 className="text-xl font-bold truncate group-hover:text-indigo-400 transition-colors">
                                            {ws.name}
                                        </h3>
                                        <code className="text-[10px] text-gray-500 font-mono tracking-tighter block mt-1">
                                            ID: {ws.id}
                                        </code>
                                    </div>
                                </div>

                                <p className="text-gray-400 text-sm line-clamp-1 mb-6">
                                    {ws.description || "No description provided."}
                                </p>

                                {/* Stats Badges */}
                                <div className="flex gap-4 mb-8">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                                        <MessageSquare size={12} className="text-indigo-400" />
                                        <span className="text-[11px] font-bold">{ws.stats?.thread_count || 0} Chats</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                                        <Database size={12} className="text-purple-400" />
                                        <span className="text-[11px] font-bold">{ws.stats?.doc_count || 0} Docs</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-6 border-t border-white/5">
                                    <button
                                        onClick={() => selectWorkspace(ws)}
                                        className={cn(
                                            "flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all",
                                            currentWorkspace?.id === ws.id
                                                ? "bg-indigo-500/10 text-indigo-400 cursor-default"
                                                : "bg-white/5 hover:bg-white/10 text-gray-300"
                                        )}
                                    >
                                        {currentWorkspace?.id === ws.id ? "Selected" : "Switch To"}
                                    </button>

                                    <button
                                        onClick={() => handleViewDetails(ws)}
                                        disabled={loadingDetail}
                                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50"
                                        title="View Details"
                                    >
                                        <Activity size={16} />
                                    </button>

                                    <button
                                        disabled={ws.id === "default"}
                                        onClick={() => startEdit(ws)}
                                        className={cn(
                                            "p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all",
                                            ws.id === "default"
                                                ? "opacity-20 cursor-not-allowed"
                                                : "text-gray-400 hover:text-blue-400"
                                        )}
                                        title={ws.id === "default" ? "System workspace cannot be edited" : "Edit"}
                                    >
                                        <Edit3 size={16} />
                                    </button>

                                    <button
                                        disabled={ws.id === "default"}
                                        onClick={() => setDeletingWs(ws)}
                                        className={cn(
                                            "p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all",
                                            ws.id === "default"
                                                ? "opacity-20 cursor-not-allowed"
                                                : "text-gray-400 hover:text-red-400"
                                        )}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Create / Edit Modal */}
            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={cancelEdit}
                            className="absolute inset-0 bg-[#0a0a0b]/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-[2rem] p-8 shadow-2xl"
                        >
                            <button
                                onClick={cancelEdit}
                                className="absolute top-8 right-8 p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-all"
                            >
                                <X size={20} />
                            </button>

                            <h2 className="text-2xl font-bold mb-6">
                                {editingWs ? 'Edit Workspace' : 'Create New Workspace'}
                            </h2>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 pr-2">
                                        Workspace Name
                                    </label>
                                    <input
                                        autoFocus
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Project Alpha"
                                        className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl px-6 py-4 focus:ring-2 ring-indigo-500 outline-none transition-all placeholder:text-gray-700 font-medium"
                                        required
                                    />
                                </div>
                                <div>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="What is this environment for?"
                                        rows={3}
                                        className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl px-6 py-4 focus:ring-2 ring-indigo-500 outline-none transition-all resize-none placeholder:text-gray-700 font-medium"
                                    />
                                </div>

                                {!editingWs && (
                                    <div className="pt-6 border-t border-white/5 space-y-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">RAG Engine (Fixed on Creation)</label>
                                            <div className="text-[10px] font-black bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md uppercase tracking-tighter border border-indigo-500/20">Immutable Logic</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-2">Provider</label>
                                                <select
                                                    value={embeddingProvider}
                                                    onChange={(e) => setEmbeddingProvider(e.target.value)}
                                                    data-testid="rag-provider-select"
                                                    className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none"
                                                >
                                                    <option value="openai">OpenAI (1536d)</option>
                                                    <option value="local">Local (768d)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-2">Strategy</label>
                                                <select
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === 'standard') { setChunkSize(800); setChunkOverlap(150); }
                                                        else if (val === 'deep') { setChunkSize(400); setChunkOverlap(100); }
                                                        else { setChunkSize(1500); setChunkOverlap(200); }
                                                    }}
                                                    data-testid="rag-strategy-select"
                                                    className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none"
                                                >
                                                    <option value="standard">Standard Balance</option>
                                                    <option value="deep">Deep Analysis (Small)</option>
                                                    <option value="large">Big Context (Large)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        data-testid="create-workspace-btn"
                                        className="flex-[2] bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 active:scale-95 transition-all shadow-lg"
                                    >
                                        {editingWs ? 'Update Workspace' : 'Create Workspace'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="flex-1 bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Deletion Modal */}
            <AnimatePresence>
                {deletingWs && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeletingWs(null)}
                            className="absolute inset-0 bg-[#0a0a0b]/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-[#121214] border border-red-500/20 rounded-[2rem] p-8 shadow-2xl"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                                <AlertCircle size={32} />
                            </div>

                            <h2 className="text-2xl font-bold mb-2">Delete Workspace?</h2>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                You are about to delete <span className="text-white font-bold">{deletingWs.name}</span>. This action cannot be undone and will have the following impact:
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="flex gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <MessageSquare size={18} className="text-gray-500 shrink-0" />
                                    <div className="text-xs">
                                        <div className="font-bold text-gray-300">Chat History Lost</div>
                                        <div className="text-gray-500 mt-1">All threads and messages associated with this workspace will be permanently hidden or removed.</div>
                                    </div>
                                </div>
                                <div className="flex gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <Database size={18} className="text-gray-500 shrink-0" />
                                    <div className="text-xs">
                                        <div className="font-bold text-gray-300">Document Disassociation</div>
                                        <div className="text-gray-500 mt-1">Uploaded documents will no longer be accessible from this workspace's retrieval context.</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={async () => {
                                        await deleteWorkspace(deletingWs.id);
                                        setDeletingWs(null);
                                    }}
                                    data-testid="confirm-delete-ws-btn"
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-600/20"
                                >
                                    Delete Workspace
                                </button>
                                <button
                                    onClick={() => setDeletingWs(null)}
                                    className="flex-1 bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
