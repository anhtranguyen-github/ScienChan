'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkspaces, WorkspaceDetail } from '@/hooks/use-workspaces';
import {
    Layout, ChevronLeft, Database, MessageSquare,
    FileText, ExternalLink, Clock, Calendar, BarChart3, Search,
    Trash2, AlertCircle, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocuments } from '@/hooks/use-documents';

export default function WorkspaceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const { getWorkspaceDetails, selectWorkspace } = useWorkspaces();
    const [viewingWs, setViewingWs] = useState<WorkspaceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { deleteDocument } = useDocuments();
    const [deletingDoc, setDeletingDoc] = useState<any | null>(null);
    const [isVaultDeleteChecked, setIsVaultDeleteChecked] = useState(false);

    useEffect(() => {
        async function load() {
            if (workspaceId) {
                const details = await getWorkspaceDetails(workspaceId);
                setViewingWs(details);
                setIsLoading(false);
            }
        }
        load();
    }, [workspaceId, getWorkspaceDetails]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!viewingWs) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                    <Layout size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Workspace Not Found</h2>
                <p className="text-gray-500 mb-8">The workspace you are looking for does not exist or has been deleted.</p>
                <button
                    onClick={() => router.push('/workspaces')}
                    className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold"
                >
                    Back to Workspaces
                </button>
            </div>
        );
    }

    const filteredThreads = viewingWs.threads.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredDocs = viewingWs.documents.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white font-sans selection:bg-indigo-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/5 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-12">
                {/* Breadcrumbs & Actions */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.push('/workspaces')}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-gray-400 hover:text-white"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 pr-2">
                                <span>Workspaces</span>
                                <span className="opacity-30">/</span>
                                <span className="text-indigo-400">{viewingWs.id}</span>
                            </div>
                            <h1 className="text-4xl font-black tracking-tight">{viewingWs.name}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search project assets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#121214] border border-white/5 rounded-2xl pl-12 pr-6 py-3 w-64 focus:w-80 outline-none focus:ring-2 ring-indigo-500/20 transition-all placeholder:text-gray-700 text-sm"
                            />
                        </div>
                        <button
                            onClick={() => {
                                selectWorkspace(viewingWs);
                                router.push('/');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                        >
                            <ExternalLink size={18} />
                            Open Workspace
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Conversations', value: viewingWs.threads.length, icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                        { label: 'Documents', value: viewingWs.documents.length, icon: Database, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                        { label: 'Usage Score', value: '88%', icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                        { label: 'Created At', value: 'Feb 2026', icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                    ].map((stat, i) => (
                        <div key={stat.label} className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex items-center gap-5">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", stat.bg)}>
                                <stat.icon size={24} className={stat.color} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
                                <div className="text-2xl font-black">{stat.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
                    {/* Left Col: Description & Info */}
                    <div className="space-y-8">
                        <section className="bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] h-full">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <Layout size={20} className="text-gray-500" />
                                Project Manifest
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Description</label>
                                    <p className="text-gray-400 leading-relaxed italic">
                                        {viewingWs.description || "No project manifest provided. This workspace serves as a standard sandbox environment."}
                                    </p>
                                </div>
                                <div className="pt-6 border-t border-white/5">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-3">Workspace Meta</label>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500">Kernel ID</span>
                                            <code className="text-indigo-400">{viewingWs.id}</code>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500">Security Scope</span>
                                            <span className="text-emerald-500 font-bold">Encrypted</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500">Persistence</span>
                                            <span className="text-gray-300">Long-term</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Col: Lists */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Threads List */}
                        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <MessageSquare size={20} className="text-indigo-400" />
                                    <h3 className="font-bold text-xl">Threads</h3>
                                </div>
                                <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full">{filteredThreads.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {filteredThreads.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-700 italic">
                                        <p>No matches found</p>
                                    </div>
                                ) : (
                                    filteredThreads.map((thread) => (
                                        <motion.div
                                            key={thread.id}
                                            whileHover={{ x: 4 }}
                                            className="p-5 rounded-3xl bg-white/5 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/20 transition-all group cursor-pointer"
                                            onClick={() => {
                                                selectWorkspace(viewingWs);
                                                localStorage.setItem('chat_thread_id', thread.id);
                                                router.push('/');
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-bold truncate block group-hover:text-indigo-400 transition-colors uppercase pr-2 tracking-tight">{thread.title}</span>
                                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500 font-medium">
                                                        <Clock size={12} />
                                                        <span>{thread.last_active ? new Date(thread.last_active).toLocaleDateString() : 'Active now'}</span>
                                                    </div>
                                                    {thread.tags && thread.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            {thread.tags.map((tag: string) => (
                                                                <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase font-black tracking-tighter">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-2 rounded-xl bg-white/5 text-gray-700 group-hover:text-indigo-400 transition-colors">
                                                    <ExternalLink size={14} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Documents List */}
                        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <Database size={20} className="text-purple-400" />
                                    <h3 className="font-bold text-xl">Resources</h3>
                                </div>
                                <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full">{filteredDocs.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {filteredDocs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-700 italic">
                                        <p>Resource bank empty</p>
                                    </div>
                                ) : (
                                    filteredDocs.map((doc, idx) => (
                                        <motion.div
                                            key={doc.id || idx}
                                            whileHover={{ x: 4 }}
                                            className="p-5 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-5 hover:border-purple-500/20 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-purple-500/5 group-hover:bg-purple-500/10 flex items-center justify-center text-purple-400/50 group-hover:text-purple-400 transition-all">
                                                <FileText size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold truncate tracking-tight uppercase">{doc.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">
                                                        {doc.extension?.toUpperCase() || "DATA"}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingDoc(doc);
                                                }}
                                                className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-700 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Deletion Modal */}
            <AnimatePresence>
                {deletingDoc && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setDeletingDoc(null)}
                            className="absolute inset-0 bg-[#0a0a0b]/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                                <AlertCircle size={32} />
                            </div>
                            <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Erase Resource?</h2>
                            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                You are removing <span className="text-white font-bold">{deletingDoc.name}</span> from this environment.
                            </p>

                            <div
                                onClick={() => setIsVaultDeleteChecked(!isVaultDeleteChecked)}
                                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 mb-8 cursor-pointer hover:bg-white/10 transition-all select-none group"
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all",
                                    isVaultDeleteChecked ? "bg-red-500 border-red-500 text-white" : "border-white/10 text-transparent"
                                )}>
                                    <Trash2 size={12} />
                                </div>
                                <div className="text-left">
                                    <div className="text-[10px] font-black uppercase text-gray-400 group-hover:text-white transition-colors">Wipe from Global Vault</div>
                                    <div className="text-[9px] text-gray-600">Permanently delete from storage and vector bank</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={async () => {
                                        await deleteDocument(deletingDoc.name, workspaceId, isVaultDeleteChecked);
                                        setDeletingDoc(null);
                                        setIsVaultDeleteChecked(false);
                                        // Refresh UI
                                        const details = await getWorkspaceDetails(workspaceId);
                                        setViewingWs(details);
                                    }}
                                    className="w-full py-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl shadow-red-600/20"
                                >
                                    Confirm Removal
                                </button>
                                <button
                                    onClick={() => setDeletingDoc(null)}
                                    className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-gray-500 font-bold hover:bg-white/10 transition-all"
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
