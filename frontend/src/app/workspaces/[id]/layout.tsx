'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { useThreads } from '@/hooks/use-threads';
import { useChat } from '@/hooks/use-chat';
import { cn } from '@/lib/utils';
import {
    Cpu, Search, Plus, MessageSquare, Trash2, Layout,
    Database, Hammer, Settings as SettingsIcon, Wrench, ChevronLeft,
    Loader2, Inbox, Shield, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { useGlobalSearch } from '@/context/search-context';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const workspaceId = params.id as string;

    const { workspaces, currentWorkspace, selectWorkspace, createWorkspace, isLoading: workspacesLoading } = useWorkspaces();
    const { threads, refreshThreads, deleteThread } = useThreads(workspaceId);
    const { clearChat, threadId, setThreadId } = useChat(workspaceId);
    const { toggleSearch } = useGlobalSearch();

    if (workspacesLoading) {
        return (
            <div className="h-screen w-screen bg-[#0a0a0b] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <span className="text-gray-500 text-sm font-medium animate-pulse">Initializing Environment...</span>
                </div>
            </div>
        );
    }

    const navigation = [
        { name: 'Intelligence Chat', icon: MessageSquare, href: `/workspaces/${workspaceId}/chat`, color: 'text-blue-400' },
        { name: 'Knowledge Vault', icon: Database, href: `/workspaces/${workspaceId}/vault`, color: 'text-purple-400' },
        { name: 'Capability Forge', icon: Hammer, href: `/workspaces/${workspaceId}/forge`, color: 'text-green-400' },
        { name: 'System Kernel', icon: Wrench, href: `/workspaces/${workspaceId}/kernel`, color: 'text-amber-400' },
    ];

    const selectThread = (id: string) => {
        setThreadId(id);
        localStorage.setItem(`chat_thread_id_${workspaceId}`, id);
        if (!pathname.includes('/chat')) {
            router.push(`/workspaces/${workspaceId}/chat`);
        }
    };

    const handleNewChat = () => {
        clearChat();
        refreshThreads();
        if (!pathname.includes('/chat')) {
            router.push(`/workspaces/${workspaceId}/chat`);
        }
    };

    return (
        <div className="flex h-screen bg-[#0a0a0b] text-white overflow-hidden font-sans">
            {/* Main Navigation Sidebar */}
            <aside className="w-72 bg-[#121214] border-r border-white/5 flex flex-col overflow-hidden relative z-30 shadow-2xl">
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/')}
                                className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                                title="Back to Dashboard"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                                <Cpu size={18} className="text-white" />
                            </div>
                            <span className="text-sm font-black tracking-tighter text-white uppercase">Architect</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={toggleSearch}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
                                title="Global Search (⌘K)"
                            >
                                <Search size={16} />
                            </button>
                        </div>
                    </div>

                    <WorkspaceSwitcher
                        workspaces={workspaces}
                        currentWorkspace={currentWorkspace}
                        onSelect={(ws) => {
                            selectWorkspace(ws);
                            router.push(`/workspaces/${ws.id}/chat`);
                        }}
                        onCreate={createWorkspace}
                    />
                </div>

                <nav className="px-3 py-4 space-y-1 border-t border-white/5">
                    <div className="px-3 mb-2 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Context Hub</div>
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <button
                                key={item.name}
                                onClick={() => router.push(item.href)}
                                className={cn(
                                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all group relative",
                                    isActive
                                        ? "bg-white/5 text-white ring-1 ring-white/10 shadow-lg"
                                        : "text-gray-500 hover:bg-white/[0.02] hover:text-gray-300"
                                )}
                            >
                                <item.icon size={16} className={cn(isActive ? item.color : "group-hover:text-gray-300")} />
                                <span className="text-xs font-bold tracking-tight">{item.name}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav"
                                        className="absolute left-0 w-1 h-4 bg-blue-500 rounded-r-full"
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="flex-1 flex flex-col overflow-hidden px-3 mt-2 border-t border-white/5">
                    <div className="flex flex-col min-h-0 py-4">
                        <div className="px-3 flex items-center justify-between mb-2">
                            <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Active Threads</div>
                            <button
                                onClick={handleNewChat}
                                className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                                title="New Session"
                            >
                                <Plus size={12} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 mt-1 pr-1">
                            {threads.length === 0 ? (
                                <div className="px-3 py-4 text-center">
                                    <MessageSquare size={24} className="mx-auto text-gray-800 mb-2 opacity-20" />
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">No Active History</p>
                                </div>
                            ) : (
                                threads.map((thread) => (
                                    <div
                                        key={thread.id}
                                        className={cn(
                                            "flex flex-col group px-1 mb-1",
                                            threadId === thread.id ? "bg-white/5 rounded-xl border border-white/5 shadow-md" : "hover:bg-white/[0.01] rounded-xl transition-all"
                                        )}
                                    >
                                        <div className="flex items-center">
                                            <button
                                                onClick={() => selectThread(thread.id)}
                                                className="flex items-center gap-3 flex-1 px-3 py-3 text-left overflow-hidden"
                                            >
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                                    threadId === thread.id ? "bg-blue-400 animate-pulse" : "bg-gray-700"
                                                )} />
                                                <span className={cn(
                                                    "text-[11px] truncate flex-1 tracking-tight font-medium",
                                                    threadId === thread.id ? "text-white" : "text-gray-500 group-hover:text-gray-400"
                                                )}>
                                                    {thread.title}
                                                </span>
                                            </button>

                                            <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Erase this thread history?')) deleteThread(thread.id);
                                                    }}
                                                    className="p-1.5 hover:text-red-400 text-gray-700 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-[#0a0a0b]/50 border-t border-white/5">
                    <div className="flex items-center justify-between gap-2 p-3 bg-white/5 rounded-2xl border border-white/5 group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-3 relative">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-[10px] shadow-lg">
                                JD
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black text-white uppercase tracking-tighter">Developer</span>
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-green-500" />
                                    <span className="text-[9px] text-gray-500 font-bold">PRO ACCOUNT</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-1 relative">
                            <button
                                onClick={() => router.push(`/workspaces/${workspaceId}/kernel`)}
                                className="p-2 text-gray-600 hover:text-white transition-colors"
                                title="Global Settings"
                            >
                                <SettingsIcon size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-[#0c0c0e]">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/5 blur-[120px] rounded-full -z-10 animate-pulse" />

                {children}
            </main>
        </div>
    );
}
