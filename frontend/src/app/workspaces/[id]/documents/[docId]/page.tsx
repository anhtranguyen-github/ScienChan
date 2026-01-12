'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    FileText, ArrowLeft, Database, Hash, Calendar,
    Box, Layers, Share2, Trash2, Download, Eye,
    Loader2, AlertCircle, Search
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { ChunkCard } from '@/components/documents/chunk-card';

interface DocumentDetail {
    id: string;
    filename: string;
    extension: string;
    workspace_id: string;
    minio_path: string;
    status: string;
    current_version: number;
    content_hash: string;
    rag_config_hash: string;
    size_bytes: number;
    chunks: number;
    created_at: string;
    updated_at: string;
    shared_with: string[];
    // Derived from workspace settings
    embedding_model?: string;
    embedding_dim?: number;
    chunk_size?: number;
    chunk_overlap?: number;
}

export default function DocumentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const docId = params.docId as string;

    const [document, setDocument] = useState<DocumentDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'chunks'>('info');
    const [chunks, setChunks] = useState<any[]>([]);
    const [isChunksLoading, setIsChunksLoading] = useState(false);

    useEffect(() => {
        fetchDocument();
    }, [docId, workspaceId]);

    useEffect(() => {
        if (activeTab === 'chunks' && chunks.length === 0) {
            fetchChunks();
        }
    }, [activeTab]);

    const fetchChunks = async () => {
        setIsChunksLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/documents/${docId}/chunks?workspace_id=${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setChunks(data);
            }
        } catch (err) {
            console.error('Failed to fetch chunks', err);
        } finally {
            setIsChunksLoading(false);
        }
    };

    const fetchDocument = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/documents/${docId}?workspace_id=${workspaceId}`);
            if (!res.ok) throw new Error('Document not found');
            const data = await res.json();
            setDocument(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <p className="text-gray-400">{error || 'Document not found'}</p>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="p-4 border-b border-white/10 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                >
                    <ArrowLeft size={18} className="text-gray-400" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-white">{document.filename}</h1>
                    <p className="text-sm text-gray-500">
                        Document ID: {document.id} • Status: {document.status}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm flex items-center gap-2">
                        <Download size={16} />
                        Download
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="border-b border-white/10 px-4">
                <div className="flex gap-1">
                    {(['info', 'chunks'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 py-3 text-sm font-medium capitalize transition-all border-b-2 -mb-px",
                                activeTab === tab
                                    ? "border-blue-500 text-white"
                                    : "border-transparent text-gray-500 hover:text-gray-300"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'info' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Basic Info */}
                        <Section title="Basic Information" icon={FileText}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <InfoCard label="Filename" value={document.filename} />
                                <InfoCard label="Extension" value={document.extension?.toUpperCase() || 'N/A'} />
                                <InfoCard label="Size" value={formatBytes(document.size_bytes)} />
                                <InfoCard label="Version" value={`v${document.current_version}`} />
                            </div>
                        </Section>

                        {/* Workspace Info */}
                        <Section title="Workspace Context" icon={Database}>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <InfoCard label="Owner Workspace" value={document.workspace_id} highlight />
                                <InfoCard
                                    label="Shared With"
                                    value={document.shared_with.length > 0 ? document.shared_with.join(', ') : 'None'}
                                />
                                <InfoCard label="Status" value={document.status} />
                            </div>
                        </Section>

                        {/* Embedding Info - CRITICAL */}
                        <Section title="Embedding & RAG Configuration" icon={Layers}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <InfoCard label="Total Chunks" value={document.chunks.toString()} />
                                <InfoCard
                                    label="Chunk Size"
                                    value={document.chunk_size ? `${document.chunk_size} chars` : 'Default'}
                                />
                                <InfoCard
                                    label="Chunk Overlap"
                                    value={document.chunk_overlap ? `${document.chunk_overlap} chars` : 'Default'}
                                />
                                <InfoCard
                                    label="Embedding Model"
                                    value={document.embedding_model || 'text-embedding-3-small'}
                                />
                                <InfoCard
                                    label="Embedding Dimension"
                                    value={document.embedding_dim?.toString() || '1536'}
                                />
                                <InfoCard label="Content Hash" value={document.content_hash?.slice(0, 16) + '...'} mono />
                                <InfoCard label="RAG Config Hash" value={document.rag_config_hash?.slice(0, 16) + '...'} mono />
                            </div>
                        </Section>

                        {/* Storage Info */}
                        <Section title="Storage & Timestamps" icon={Calendar}>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoCard label="MinIO Path" value={document.minio_path} mono />
                                <InfoCard label="Created At" value={formatDate(document.created_at)} />
                                <InfoCard label="Updated At" value={formatDate(document.updated_at)} />
                            </div>
                        </Section>
                    </div>
                )}

                {activeTab === 'chunks' && (
                    <div className="max-w-5xl mx-auto space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Layers size={18} className="text-blue-500" />
                                Index Chunks ({document.chunks})
                            </h2>
                            <div className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5">
                                Showing first {chunks.length} chunks
                            </div>
                        </div>

                        {isChunksLoading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                <p className="text-sm text-gray-500">Retrieving chunks from vector store...</p>
                            </div>
                        ) : chunks.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {chunks.map((chunk) => (
                                    <ChunkCard key={chunk.id} chunk={chunk} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-24 bg-[#121214] rounded-3xl border border-dashed border-white/5">
                                <Database className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-400 font-medium">No chunks found</p>
                                <p className="text-sm text-gray-600 mt-1">Make sure the document is successfully indexed.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-[#121214] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    );
}

function InfoCard({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
    return (
        <div className={cn(
            "p-3 rounded-lg",
            highlight ? "bg-blue-500/10 border border-blue-500/20" : "bg-white/5"
        )}>
            <div className="text-[10px] text-gray-500 uppercase mb-1">{label}</div>
            <div className={cn(
                "text-sm font-medium truncate",
                highlight ? "text-blue-400" : "text-white",
                mono && "font-mono text-xs"
            )}>
                {value}
            </div>
        </div>
    );
}
