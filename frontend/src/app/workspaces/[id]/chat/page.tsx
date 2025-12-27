'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChat } from '@/hooks/use-chat';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import {
    Send, Bot, Loader2, Zap, Brain, MessageSquare,
    AlertCircle, FileText
} from 'lucide-react';
import { ChatMessage } from '@/components/chat-message';
import { CitationModal } from '@/components/chat/citation';

type ChatMode = 'fast' | 'thinking' | 'reasoning';

export default function ChatPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const { messages, isLoading, sendMessage } = useChat(workspaceId);
    const { settings, updateSettings } = useSettings();

    const [input, setInput] = useState('');
    const [mode, setMode] = useState<ChatMode>('fast');
    const [activeSource, setActiveSource] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Mode Selector Header */}
            <header className="p-4 border-b border-white/10 flex items-center justify-between">
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
