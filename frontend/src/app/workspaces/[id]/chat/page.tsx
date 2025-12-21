'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChat } from '@/hooks/use-chat';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api-config';
import {
    Send, Bot, Loader2, Zap, Brain, MessageSquare,
    AlertCircle, FileText, Plus, Trash2, History, X, Edit2
} from 'lucide-react';
import { ChatMessage } from '@/components/chat-message';
import { CitationModal } from '@/components/chat/citation';

type ChatMode = 'fast' | 'thinking' | 'reasoning';

interface Thread {
    id: string;
    title: string;
    last_active: string;
    message_count: number;
}

export default function ChatPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const { messages, isLoading, sendMessage, clearChat, threadId, setThreadId } = useChat(workspaceId);
    const { settings, updateSettings } = useSettings();

    const [input, setInput] = useState('');
    const [mode, setMode] = useState<ChatMode>('fast');
    const [activeSource, setActiveSource] = useState<any>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoadingThreads, setIsLoadingThreads] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Fetch threads when history panel opens
    useEffect(() => {
        if (showHistory) {
            fetchThreads();
        }
    }, [showHistory, workspaceId]);

    const fetchThreads = async () => {
        setIsLoadingThreads(true);
        try {
            const res = await fetch(`${API_BASE_URL}/chat/threads?workspace_id=${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setThreads(data.threads || []);
            }
        } catch (err) {
            console.error('Failed to fetch threads', err);
        } finally {
            setIsLoadingThreads(false);
        }
    };

    const selectThread = (id: string) => {
        setThreadId(id);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`chat_thread_id_${workspaceId}`, id);
        }
        setShowHistory(false);
    };

    const deleteThread = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`${API_BASE_URL}/chat/threads/${id}`, { method: 'DELETE' });
            setThreads(prev => prev.filter(t => t.id !== id));
            if (threadId === id) {
                clearChat();
            }
        } catch (err) {
            console.error('Failed to delete thread', err);
        }
    };

    const startNewChat = () => {
        clearChat();
        setShowHistory(false);
    };

    // Sync mode with settings
    useEffect(() => {
        if (settings?.show_reasoning) {
            setMode('reasoning');
        }
    }, [settings]);

    const handleModeChange = async (newMode: ChatMode) => {
        setMode(newMode);
        if (updateSettings) {
            await updateSettings({ show_reasoning: newMode === 'reasoning' });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        sendMessage(input);
        setInput('');
    };

    const handleCitationClick = (id: number, message: any) => {
        const source = message.sources?.find((s: any) => s.id === id);
        if (source) {
            setActiveSource(source);
        }
    };

    const modeOptions = [
        { id: 'fast', label: 'Fast', icon: Zap, description: 'Quick responses' },
        { id: 'thinking', label: 'Thinking', icon: Brain, description: 'Deliberate analysis' },
        { id: 'reasoning', label: 'Reasoning', icon: MessageSquare, description: 'Show thought process' },
    ];

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex-1 flex h-full relative">
            {/* History Sidebar */}
            <div className={cn(
                "absolute inset-y-0 left-0 w-80 bg-[#0a0a0b] border-r border-white/10 z-40 transition-transform duration-300",
                showHistory ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <History size={16} />
                        Chat History
                    </h3>
                    <button
                        onClick={() => setShowHistory(false)}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-3">
                    <button
                        onClick={startNewChat}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all"
                    >
                        <Plus size={16} />
                        New Chat
                    </button>
                </div>

                <div className="overflow-y-auto h-[calc(100%-120px)]">
                    {isLoadingThreads ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            No chat history yet
                        </div>
                    ) : (
                        <div className="px-3 space-y-1">
                            {threads.map((thread) => (
                                <button
                                    key={thread.id}
                                    onClick={() => selectThread(thread.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all group",
                                        threadId === thread.id
                                            ? "bg-white/10 text-white"
                                            : "hover:bg-white/5 text-gray-400"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {thread.title || 'Untitled Chat'}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            {formatDate(thread.last_active)} • {thread.message_count} msgs
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => deleteThread(thread.id, e)}
                                        className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full">
                {/* Mode Selector Header */}
                <header className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                showHistory
                                    ? "bg-blue-600 text-white"
                                    : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                            )}
                            title="Chat History"
                        >
                            <History size={18} />
                        </button>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Mode:</span>
                            <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
                                {modeOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleModeChange(opt.id as ChatMode)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all",
                                            mode === opt.id
                                                ? "bg-blue-600 text-white"
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                        title={opt.description}
                                    >
                                        <opt.icon size={14} />
                                        <span>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Workspace: {workspaceId}</span>
                    </div>
                </header>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mb-4">
                                <Bot size={32} className="text-blue-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Start a Conversation</h2>
                            <p className="text-gray-500 max-w-md">
                                Ask questions about your documents. Citations will appear inline when knowledge is retrieved.
                            </p>

                            {/* Quick Start Options */}
                            <div className="grid grid-cols-2 gap-3 mt-6 max-w-md">
                                {['Summarize my documents', 'Find related concepts', 'Explain this topic', 'Compare sources'].map((prompt) => (
                                    <button
                                        key={prompt}
                                        onClick={() => sendMessage(prompt)}
                                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm text-gray-400 hover:text-white transition-all text-left"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                message={message}
                                showReasoning={mode === 'reasoning'}
                                isLoading={isLoading && message.id === messages[messages.length - 1].id}
                                onCitationClick={(id) => handleCitationClick(id, message)}
                            />
                        ))
                    )}

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex items-center gap-3 text-gray-500">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                <Loader2 size={16} className="text-blue-500 animate-spin" />
                            </div>
                            <span className="text-sm">
                                {mode === 'reasoning' ? 'Reasoning...' : mode === 'thinking' ? 'Thinking...' : 'Processing...'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Input */}
                <footer className="p-4 border-t border-white/10">
                    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-3 bg-[#121214] border border-white/10 rounded-xl p-2">
                            <input
                                id="chat-input"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question..."
                                className="flex-1 bg-transparent border-none focus:outline-none py-3 px-4 text-white placeholder:text-gray-500"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="w-12 h-12 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                                aria-label="Send message"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </form>
                </footer>
            </div>

            {/* Overlay for sidebar */}
            {showHistory && (
                <div
                    className="absolute inset-0 bg-black/50 z-30"
                    onClick={() => setShowHistory(false)}
                />
            )}

            {/* Citation Modal */}
            {activeSource && (
                <CitationModal
                    source={activeSource}
                    onClose={() => setActiveSource(null)}
                />
            )}
        </div>
    );
}
