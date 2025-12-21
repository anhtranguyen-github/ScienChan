'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FileText, Upload, Trash2, Share2, Search,
    Loader2, AlertCircle, Filter, Grid, List
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { cn } from '@/lib/utils';

interface Document {
    id: string;
    filename: string;
    extension: string;
    status: string;
    size_bytes: number;
    chunks: number;
    created_at: string;
    workspace_id: string;
    shared_with: string[];
}

export default function DocumentsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchDocuments();
    }, [workspaceId]);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/documents?workspace_id=${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (err) {
            console.error('Failed to fetch documents', err);
        } finally {
            setIsLoading(false);
        }
    };


    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'indexed': return 'bg-green-500/20 text-green-400';
            case 'indexing': return 'bg-yellow-500/20 text-yellow-400';
            case 'failed': return 'bg-red-500/20 text-red-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="p-4 border-b border-white/10 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white">Documents</h1>
                    <p className="text-sm text-gray-500">
                        {documents.length} documents in workspace
                    </p>
                </div>
                <button
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium flex items-center gap-2 transition-all"
                >
                    <Upload size={16} />
                    Upload Document
                </button>
            </header>

            {/* Filters */}
            <div className="p-4 border-b border-white/10 flex items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 ring-blue-500/50"
                    />
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none"
                >
                    <option value="all">All Status</option>
                    <option value="indexed">Indexed</option>
                    <option value="indexing">Indexing</option>
                    <option value="failed">Failed</option>
                </select>

                {/* View Mode */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded",
                            viewMode === 'list' ? "bg-white/10 text-white" : "text-gray-500"
                        )}
                    >
                        <List size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2 rounded",
                            viewMode === 'grid' ? "bg-white/10 text-white" : "text-gray-500"
                        )}
                    >
                        <Grid size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : filteredDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="w-12 h-12 text-gray-600 mb-4" />
                        <p className="text-gray-400 mb-2">No documents found</p>
                        <p className="text-sm text-gray-600">
                            {documents.length === 0
                                ? 'Upload your first document to get started'
                                : 'Try adjusting your search or filters'}
                        </p>
                    </div>
                ) : viewMode === 'list' ? (
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase border-b border-white/5">
                                <th className="pb-3 font-medium">Name</th>
                                <th className="pb-3 font-medium">Type</th>
                                <th className="pb-3 font-medium">Size</th>
                                <th className="pb-3 font-medium">Chunks</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 font-medium">Date</th>
                                <th className="pb-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocs.map((doc) => (
                                <tr
                                    key={doc.id}
                                    className="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                                    onClick={() => router.push(`/workspaces/${workspaceId}/documents/${doc.id}`)}
                                >
                                    <td className="py-3">
                                        <div className="flex items-center gap-3">
                                            <FileText size={16} className="text-gray-500" />
                                            <span className="text-white font-medium">{doc.filename}</span>
                                            {doc.shared_with.length > 0 && (
                                                <Share2 size={12} className="text-blue-400" title="Shared" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 text-sm text-gray-400 uppercase">{doc.extension}</td>
                                    <td className="py-3 text-sm text-gray-400">{formatBytes(doc.size_bytes)}</td>
                                    <td className="py-3 text-sm text-gray-400">{doc.chunks}</td>
                                    <td className="py-3">
                                        <span className={cn("px-2 py-1 rounded text-xs font-medium", getStatusColor(doc.status))}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="py-3 text-sm text-gray-500">{formatDate(doc.created_at)}</td>
                                    <td className="py-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); /* delete logic */ }}
                                            className="p-2 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredDocs.map((doc) => (
                            <Link
                                key={doc.id}
                                href={`/workspaces/${workspaceId}/documents/${doc.id}`}
                                className="p-4 bg-[#121214] rounded-xl border border-white/5 hover:border-white/10 transition-all"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <FileText size={20} className="text-blue-500" />
                                    </div>
                                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getStatusColor(doc.status))}>
                                        {doc.status}
                                    </span>
                                </div>
                                <h3 className="text-sm font-medium text-white truncate mb-1">{doc.filename}</h3>
                                <p className="text-xs text-gray-500">
                                    {formatBytes(doc.size_bytes)} • {doc.chunks} chunks
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
