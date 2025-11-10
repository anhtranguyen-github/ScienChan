'use client';

import React, { useState } from 'react';
import { useDocuments, Document, DocumentPoint } from '@/hooks/use-documents';
import { useWorkspaces } from '@/hooks/use-workspaces';
import {
    FileText, Database, Trash2, Share2,
    ExternalLink, Info, Search, Filter,
    ChevronLeft, Layers, MoreHorizontal, Layout,
    Move, X, Check, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentsPage() {
    const { documents, isLoading, deleteDocument, updateWorkspaceAction, inspectDocument } = useDocuments();
    const { workspaces } = useWorkspaces();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [inspectedPoints, setInspectedPoints] = useState<any[]>([]);
    const [loadingInspect, setLoadingInspect] = useState(false);
    const [actionDoc, setActionDoc] = useState<{ doc: Document, type: 'move' | 'share' } | null>(null);
    const [filterWorkspace, setFilterWorkspace] = useState<string>('all');

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWorkspace = filterWorkspace === 'all' || doc.workspace_id === filterWorkspace || doc.shared_with.includes(filterWorkspace);
        return matchesSearch && matchesWorkspace;
    });

    const handleSelectDoc = async (doc: Document) => {
        setSelectedDoc(doc);
        setLoadingInspect(true);
        const data = await inspectDocument(doc.name);
        if (data) setInspectedPoints(data);
        setLoadingInspect(false);
    };

    const handleAction = async (targetWsId: string) => {
        if (!actionDoc) return;
        const success = await updateWorkspaceAction(
            actionDoc.doc.name,
            actionDoc.doc.workspace_id,
            targetWsId,
            actionDoc.type
        );
        if (success) setActionDoc(null);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Background Decor */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
                    <div className="flex items-center gap-6">
                        <a
                            href="/"
                            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-gray-400 hover:text-white"
                        >
                            <ChevronLeft size={20} />
                        </a>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight">Knowledge Bank</h1>
                            <p className="text-gray-500 mt-1">Global document assets and cross-workspace orchestration.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search resources..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#121214] border border-white/5 rounded-2xl pl-12 pr-6 py-3 w-64 focus:w-80 outline-none focus:ring-2 ring-indigo-500/20 transition-all placeholder:text-gray-700 text-sm"
                            />
                        </div>

                        <select
                            value={filterWorkspace}
                            onChange={(e) => setFilterWorkspace(e.target.value)}
                            className="bg-[#121214] border border-white/5 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-indigo-500/20 transition-all text-gray-400"
                        >
                            <option value="all">All Workspaces</option>
                            {workspaces.map(ws => (
                                <option key={ws.id} value={ws.id}>{ws.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table View */}
                <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5">
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Document Name</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Primary Workspace</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Distribution</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Assets</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right pr-12">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <div className="inline-block w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                        </td>
                                    </tr>
                                ) : filteredDocs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center text-gray-600 italic">
                                            No documents found in the current scope.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDocs.map((doc, idx) => (
                                        <motion.tr
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={doc.name}
                                            className="group hover:bg-white/[0.01] border-b border-white/5 transition-all"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors uppercase tracking-tight">{doc.name}</div>
                                                        <div className="text-[10px] text-gray-600 mt-1 uppercase font-black tracking-widest">{doc.extension}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 w-fit">
                                                    <Layers size={12} className="text-gray-500" />
                                                    <span className="text-[11px] font-bold text-gray-400">
                                                        {workspaces.find(ws => ws.id === doc.workspace_id)?.name || doc.workspace_id}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-1">
                                                    {doc.shared_with.length > 0 ? (
                                                        <div className="flex -space-x-2">
                                                            {doc.shared_with.slice(0, 3).map((wsId, i) => (
                                                                <div key={wsId} className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-[#121214] flex items-center justify-center text-[8px] font-black text-white" title={wsId}>
                                                                    {wsId[0].toUpperCase()}
                                                                </div>
                                                            ))}
                                                            {doc.shared_with.length > 3 && (
                                                                <div className="w-6 h-6 rounded-full bg-gray-800 border-2 border-[#121214] flex items-center justify-center text-[8px] font-black text-gray-400">
                                                                    +{doc.shared_with.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-700 font-bold uppercase tracking-widest">
                                                            <Globe size={10} />
                                                            Private
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-xs font-mono text-indigo-400/70">
                                                    {doc.chunks} Segments
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right pr-12">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSelectDoc(doc)}
                                                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all"
                                                        title="Detailed Info"
                                                    >
                                                        <Info size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setActionDoc({ doc, type: 'share' })}
                                                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-indigo-400 transition-all"
                                                        title="Share"
                                                    >
                                                        <Share2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setActionDoc({ doc, type: 'move' })}
                                                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-purple-400 transition-all"
                                                        title="Move"
                                                    >
                                                        <Move size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteDocument(doc.name, doc.workspace_id)}
                                                        className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                                                        title="Delete Global"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Document Details Modal (Metadata Inspector) */}
            <AnimatePresence>
                {selectedDoc && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedDoc(null)}
                            className="absolute inset-0 bg-[#0a0a0b]/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-5xl bg-[#121214] border border-white/10 rounded-[3rem] p-12 shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <button onClick={() => setSelectedDoc(null)} className="absolute top-10 right-10 p-3 rounded-2xl hover:bg-white/5 text-gray-500 transition-all">
                                <X size={24} />
                            </button>

                            <div className="flex items-center gap-6 mb-12 border-b border-white/5 pb-10">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-xl border border-indigo-500/20">
                                    <Database size={40} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 pr-2">
                                        <span>Document Metadata</span>
                                        <span className="opacity-20">•</span>
                                        <span className="text-indigo-400">Vector Storage Active</span>
                                    </div>
                                    <h2 className="text-3xl font-black uppercase tracking-tight">{selectedDoc.name}</h2>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-lg">
                                            <Layers size={14} className="text-indigo-400" />
                                            {selectedDoc.chunks} Points
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-lg">
                                            <FileText size={14} className="text-purple-400" />
                                            {selectedDoc.extension.toUpperCase()} Format
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata Grid */}
                            <div className="flex-1 overflow-y-auto pr-4 space-y-6 custom-scrollbar">
                                {loadingInspect ? (
                                    <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-600">Retrieving Vector Map...</div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {inspectedPoints.map((point, i) => (
                                            <div key={point.id} className="bg-[#0a0a0b]/50 border border-white/5 rounded-[2rem] p-6 text-xs font-mono group">
                                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                                                    <span className="text-indigo-500 font-bold tracking-tighter">Point ID: {String(point.id).slice(0, 16)}...</span>
                                                    <span className="bg-indigo-500/10 px-2 py-0.5 rounded text-[8px] text-indigo-400 font-black uppercase tracking-widest">
                                                        Dim: {point.vector_size}
                                                    </span>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 pr-2">Vector Preview</div>
                                                        <div className="bg-[#121214] p-3 rounded-xl text-indigo-300/60 overflow-x-auto whitespace-nowrap text-[10px]">
                                                            [{point.vector_preview.map((v: number) => v.toFixed(4)).join(', ')} ... ]
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 pr-2">Payload Content</div>
                                                        <div className="bg-[#121214] p-4 rounded-xl text-gray-400 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar italic whitespace-pre-wrap">
                                                            {point.payload.text || 'No text content'}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                                        <div>
                                                            <div className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1 pr-2">Workspace context</div>
                                                            <div className="text-indigo-400">{point.payload.workspace_id}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1 pr-2">Chunk Index</div>
                                                            <div className="text-white">{point.payload.index ?? i}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Action Modal (Move/Share) */}
            <AnimatePresence>
                {actionDoc && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setActionDoc(null)}
                            className="absolute inset-0 bg-[#0a0a0b]/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
                        >
                            <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">
                                {actionDoc.type === 'move' ? 'Move Document' : 'Share Document'}
                            </h2>
                            <p className="text-gray-500 text-sm mb-8">
                                {actionDoc.type === 'move'
                                    ? `Migrate "${actionDoc.doc.name}" to another project environment.`
                                    : `Enable access for "${actionDoc.doc.name}" in a different workspace context.`}
                            </p>

                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {workspaces
                                    .filter(ws => ws.id !== actionDoc.doc.workspace_id)
                                    .map(ws => (
                                        <button
                                            key={ws.id}
                                            onClick={() => handleAction(ws.id)}
                                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                    <Layout size={16} />
                                                </div>
                                                <span className="font-bold text-sm tracking-tight">{ws.name}</span>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-gray-700 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                <Check size={12} />
                                            </div>
                                        </button>
                                    ))
                                }
                                {workspaces.length <= 1 && (
                                    <div className="text-center py-6 text-gray-600 italic text-sm">
                                        No other workspaces available.
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setActionDoc(null)}
                                className="w-full mt-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
