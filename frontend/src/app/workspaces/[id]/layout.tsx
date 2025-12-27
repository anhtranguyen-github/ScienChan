'use client';

import { useParams, useRouter } from 'next/navigation';
import { useWorkspaces, Workspace } from '@/hooks/use-workspaces';
import { WorkspaceProvider } from '@/context/workspace-context';
import { WorkspaceHeader } from '@/components/layout/workspace-header';
import { useState } from 'react';
import { X, Check, Plus, ChevronDown, Search, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const { workspaces, currentWorkspace, switchWorkspace } = useWorkspaces();

    const [showSwitcher, setShowSwitcher] = useState(false);

    const handleWorkspaceSelect = (ws: Workspace) => {
        switchWorkspace(ws.id);
        router.push(`/workspaces/${ws.id}`);
        setShowSwitcher(false);
    };

    return (
        <WorkspaceProvider workspaceId={workspaceId}>
            <div className="flex flex-col h-screen bg-[#0a0a0b] text-white">
                {/* Workspace Header - Always visible */}
                <WorkspaceHeader onWorkspaceClick={() => setShowSwitcher(true)} />

                {/* Main Content */}
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>

                {/* Workspace Switcher Modal */}
                {showSwitcher && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setShowSwitcher(false)}
                        />
                        <div className="relative bg-[#0f0f10] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                            {/* Header */}
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Switch Workspace</h3>
                                <button
                                    onClick={() => setShowSwitcher(false)}
                                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
                                >
                                    <X size={16} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Workspace List */}
                            <div className="max-h-[400px] overflow-y-auto p-2">
                                {workspaces.map((ws) => (
                                    <button
                                        key={ws.id}
                                        onClick={() => handleWorkspaceSelect(ws)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                                            ws.id === workspaceId
                                                ? "bg-blue-500/20 border border-blue-500/30"
                                                : "hover:bg-white/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                                            ws.id === 'default' ? "bg-gray-600" : "bg-blue-600"
                                        )}>
                                            {ws.name[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-white truncate">{ws.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {ws.id === 'default' ? 'System Default' : `ID: ${ws.id}`}
                                                {ws.stats && ` • ${ws.stats.doc_count} docs`}
                                            </div>
                                        </div>
                                        {ws.id === workspaceId && (
                                            <Check size={16} className="text-blue-500" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-white/10 flex gap-2">
                                <Link
                                    href="/"
                                    onClick={() => setShowSwitcher(false)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-300"
                                >
                                    <Layout size={16} />
                                    All Workspaces
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </WorkspaceProvider>
    );
}
