'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChat, Message } from '@/hooks/use-chat';
import { useSettings } from '@/hooks/use-settings';
import { useThreads } from '@/hooks/use-threads';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { cn } from '@/lib/utils';
import {
    Send, Bot, Loader2, Zap, Shield, Info, Sparkles, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '@/components/chat-message';
import { SourceViewer } from '@/components/source-viewer';

export default function ChatPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const { currentWorkspace } = useWorkspaces();
    const { messages, isLoading, sendMessage, refreshThreads } = useChat(workspaceId);
    const { settings, updateSettings } = useSettings();

    const [input, setInput] = useState('');
    const [activeSource, setActiveSource] = useState<{ id: number; name: string; content: string } | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        sendMessage(input);
        setInput('');
    };

    const handleCitationClick = (id: number, message: Message) => {
        const source = message.sources?.find(s => s.id === id);
        if (source) {
            setActiveSource(source);
        } else {
            setNotification({
                message: `Citation [${id}] content is no longer available in history metadata.`,
                type: 'error'
            });
        }
    };

    const toggleThinkingMode = async () => {
        if (!settings) return;
        await updateSettings({ show_reasoning: !settings.show_reasoning });
    };

    return (
        <div className="flex-1 flex flex-col h-full relative">
            <header className="h-20 border-b border-white/5 flex items-center px-8 justify-between backdrop-blur-md sticky top-0 z-10 bg-[#0a0a0b]/50">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <h2 className="text-lg font-bold tracking-tight">{currentWorkspace?.name || 'Loading Architecture...'}</h2>
                        </div>
                        <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest ml-4">
                            Operational Context: {workspaceId}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleThinkingMode}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest ring-offset-[#0a0a0b] focus:ring-2 ring-indigo-500/50",
                            settings?.show_reasoning
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                                : "bg-white/5 border-white/10 text-gray-500"
                        )}
                    >
                        {settings?.show_reasoning ? <Sparkles size={12} className="animate-pulse" /> : <Zap size={12} />}
                        <span>{settings?.show_reasoning ? "Reasoning Engine: Active" : "Fast Strike Mode"}</span>
                    </button>

                    <div className="h-8 w-px bg-white/5 mx-2" />

                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                        <Shield size={14} className="text-blue-500" />
                        <span className="text-[10px] font-black text-gray-500 uppercase">Secure Line</span>
                    </div>
                </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-10 scroll-smooth custom-scrollbar">
                <AnimatePresence initial={false}>
                    {messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-full text-center space-y-8 max-w-2xl mx-auto py-20"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                                <div className="relative w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-[#1e1e21] to-[#121214] flex items-center justify-center border border-white/10 shadow-2xl">
                                    <Bot size={48} className="text-blue-500" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h1 className="text-5xl font-black tracking-tighter uppercase text-white">
                                    Architect <span className="text-blue-500">v2.0</span>
                                </h1>
                                <p className="text-gray-500 leading-relaxed text-lg font-medium">
                                    {currentWorkspace?.description || 'Strategic reasoning initialized. Upload documents to the Vault to activate deep context retrieval.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full pt-4">
                                {[
                                    { text: 'Analyze Technical Specs', icon: Zap },
                                    { text: 'Extract Strategic Insights', icon: Shield },
                                    { text: 'Verify Documentation', icon: Info },
                                    { text: 'Reason via Knowledge Graph', icon: Sparkles }
                                ].map((tip) => (
                                    <button
                                        key={tip.text}
                                        onClick={() => sendMessage(tip.text)}
                                        className="group p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all text-sm font-bold text-left text-gray-400 hover:text-white flex flex-col gap-3 shadow-sm hover:shadow-blue-500/10"
                                    >
                                        <tip.icon size={20} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                                        {tip.text}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {messages.map((message) => (
                        <ChatMessage
                            key={message.id}
                            message={message}
                            showReasoning={settings?.show_reasoning}
                            isLoading={isLoading && message.id === messages[messages.length - 1].id}
                            onCitationClick={(id) => handleCitationClick(id, message)}
                        />
                    ))}

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-5 max-w-4xl mx-auto"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-[#1e1e21] border border-white/10 flex items-center justify-center shadow-lg">
                                <Bot size={20} className="text-blue-500" />
                            </div>
                            <div className="p-6 rounded-3xl bg-[#161619] border border-white/5 flex items-center gap-3 shadow-2xl shadow-blue-500/5">
                                <Loader2 size={18} className="animate-spin text-blue-500" />
                                <span className="text-xs font-black uppercase tracking-widest text-gray-500">Processing Reasoning Stream...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <footer className="p-10 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/80 to-transparent sticky bottom-0">
                <form
                    onSubmit={handleSubmit}
                    className="max-w-4xl mx-auto relative group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[2.2rem] blur opacity-0 group-focus-within:opacity-100 transition duration-1000" />
                    <div className="relative flex items-center bg-[#18181b] border border-white/10 rounded-[2rem] p-2 pr-5 shadow-2xl ring-1 ring-white/5 group-focus-within:ring-blue-500/30 transition-all">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Initialize query for AI Architect..."
                            className="flex-1 bg-transparent border-none focus:ring-0 py-5 px-8 text-[15px] placeholder:text-gray-600 font-medium text-gray-200"
                        />
                        <button
                            type="submit"
                            aria-label="Send message"
                            disabled={isLoading || !input.trim()}
                            className="w-14 h-14 rounded-2xl bg-white text-[#0a0a0b] flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all shadow-2xl shadow-white/10 group-focus-within:bg-blue-500 group-focus-within:text-white"
                        >
                            <Send size={24} />
                        </button>
                    </div>
                </form>
                <div className="text-center mt-6 text-[9px] text-gray-700 font-black uppercase tracking-[0.3em] opacity-50">
                    Neural Hybrid Engine • Workspace: {workspaceId}
                </div>
            </footer>

            <AnimatePresence>
                {activeSource && (
                    <SourceViewer
                        key="source-viewer-modal"
                        source={activeSource}
                        onClose={() => setActiveSource(null)}
                    />
                )}

                {notification && (
                    <motion.div
                        key="notification-toast"
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className={cn(
                            "fixed bottom-32 left-1/2 z-[100] px-8 py-4 rounded-[2rem] shadow-2xl border text-[11px] font-black uppercase tracking-widest flex items-center gap-4 backdrop-blur-xl",
                            notification.type === 'error'
                                ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/10"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-blue-500/10"
                        )}
                    >
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            notification.type === 'error' ? "bg-red-500 animate-pulse" : "bg-blue-500"
                        )} />
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
