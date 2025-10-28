'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat, Message } from '@/hooks/use-chat';
import { useSettings } from '@/hooks/use-settings';
import { useThreads } from '@/hooks/use-threads';
import { cn } from '@/lib/utils';
import {
  Send, Cpu, Loader2, Wrench, Bot, Trash2, User,
  Settings as SettingsIcon, Lightbulb, LightbulbOff,
  Plus, ChevronDown, ChevronRight, MessageSquare, Database, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeBase } from '@/components/knowledge-base';
import { ToolsManager } from '@/components/tools-manager';
import { SettingsManager } from '@/components/settings-manager';
import { ChatMessage } from '@/components/chat-message';
import { SourceViewer } from '@/components/source-viewer';

export default function ChatPage() {
  const { messages, isLoading, sendMessage, clearChat, threadId, setThreadId } = useChat();
  const { threads, refreshThreads, updateThreadTitle, deleteThread } = useThreads();
  const { settings, updateSettings } = useSettings();
  const [input, setInput] = useState('');
  const [showTools, setShowTools] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isKBOpen, setIsKBOpen] = useState(true);
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
    // Refresh threads list when a new message starts a new thread (or just periodically)
    setTimeout(refreshThreads, 1000);
  };

  const handleNewChat = () => {
    clearChat();
    refreshThreads();
  };

  const selectThread = (id: string) => {
    setThreadId(id);
    localStorage.setItem('chat_thread_id', id);
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
    <div className="flex h-screen bg-[#0a0a0b] text-white overflow-hidden font-sans">
      {/* Sidebar - Modern Dark Glass */}
      <aside className="w-80 bg-[#121214] border-r border-white/5 flex flex-col overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu size={22} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">AI Architect</span>
          </div>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-3 w-full p-4 rounded-2xl bg-blue-600 hover:bg-blue-500 transition-all border border-blue-400/20 group shrink-0 shadow-lg shadow-blue-600/10"
          >
            <Plus size={18} className="text-white" />
            <span className="text-sm font-bold">New Chat</span>
          </button>
        </div>

        {/* Sidebar Scrollable Content */}
        <div className="flex-1 flex flex-col overflow-hidden px-4 min-h-0">
          {/* Thread History Section */}
          <div className={cn(
            "flex flex-col min-h-0 transition-all duration-500 ease-in-out py-4",
            isHistoryOpen ? "flex-1" : "flex-none"
          )}>
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors group"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={14} />
                <span>Chat History</span>
              </div>
              {isHistoryOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <AnimatePresence initial={false}>
              {isHistoryOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-y-auto custom-scrollbar space-y-1 mt-2"
                >
                  {threads.length === 0 ? (
                    <div className="px-4 py-3 text-[11px] text-gray-600 italic">No recent conversations</div>
                  ) : (
                    threads.map((thread) => (
                      <div
                        key={thread.id}
                        className={cn(
                          "flex items-center gap-1 w-full rounded-xl transition-all group",
                          threadId === thread.id
                            ? "bg-white/10 text-white border border-white/10"
                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                        )}
                      >
                        <button
                          onClick={() => selectThread(thread.id)}
                          className="flex items-center gap-3 flex-1 px-4 py-3 text-left overflow-hidden"
                        >
                          <MessageSquare size={14} className={cn(threadId === thread.id ? "text-blue-400" : "text-gray-600 group-hover:text-gray-400")} />
                          <span className="text-xs font-medium truncate flex-1">{thread.title}</span>
                          {thread.has_thinking && (
                            <Lightbulb size={12} className="text-yellow-500/50 group-hover:text-yellow-500 transition-colors" />
                          )}
                        </button>

                        <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newTitle = prompt('New title:', thread.title);
                              if (newTitle && newTitle !== thread.title) {
                                updateThreadTitle(thread.id, newTitle);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-blue-400 transition-colors"
                            title="Rename"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this chat?')) {
                                deleteThread(thread.id);
                                if (threadId === thread.id) handleNewChat();
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-px bg-white/5 my-4 mx-2 shrink-0" />

          {/* Knowledge Base Section */}
          <div className={cn(
            "flex flex-col min-h-0 transition-all duration-500 ease-in-out py-4",
            isKBOpen ? "flex-1" : "flex-none"
          )}>
            <button
              onClick={() => setIsKBOpen(!isKBOpen)}
              className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors group shrink-0"
            >
              <div className="flex items-center gap-2">
                <Database size={14} />
                <span>Knowledge Base</span>
              </div>
              {isKBOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <AnimatePresence initial={false}>
              {isKBOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-h-0 mt-2 overflow-hidden"
                >
                  <KnowledgeBase />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 bg-[#0a0a0b]/50 border-t border-white/5 space-y-2">
          <button
            onClick={() => setShowTools(true)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-all group text-gray-400 hover:text-white"
          >
            <Wrench size={16} className="group-hover:text-blue-400 transition-colors" />
            <span className="text-sm font-medium">Manage Tools</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-all group text-gray-400 hover:text-white"
          >
            <SettingsIcon size={16} className="group-hover:text-purple-400 transition-colors" />
            <span className="text-sm font-medium">Global Settings</span>
          </button>

          <div className="mt-4 px-4 py-3 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                <User size={14} className="text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-300">Pro Developer</span>
                <span className="text-[9px] text-gray-500 font-medium">Online & Synced</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full -z-10" />

        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center px-8 justify-between backdrop-blur-md sticky top-0 z-10 bg-[#0a0a0b]/50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-lg font-semibold">Live Reasoning Session</h2>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleThinkingMode}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 text-xs font-bold uppercase tracking-wider",
                settings?.show_reasoning
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                  : "bg-white/5 border-white/10 text-gray-500"
              )}
            >
              {settings?.show_reasoning ? (
                <>
                  <Lightbulb size={14} className="animate-pulse" />
                  <span>Thinking ON</span>
                </>
              ) : (
                <>
                  <LightbulbOff size={14} />
                  <span>Thinking OFF</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-2xl mx-auto"
              >
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Bot size={40} className="text-blue-500" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2 tracking-tight">AI Reasoning Engine</h1>
                  <p className="text-gray-400 leading-relaxed text-lg">
                    Upload documents to the Knowledge Base to enable context-aware retrieval and advanced reasoning.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  {['Research the uploaded paper', 'Summarize key findings', 'Compare methodologies', 'Extract technical specs'].map((tip) => (
                    <button
                      key={tip}
                      onClick={() => sendMessage(tip)}
                      className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-sm text-left text-gray-300"
                    >
                      {tip}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-5 max-w-4xl mx-auto"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#1e1e21] border border-white/10 flex items-center justify-center">
                  <Bot size={20} className="text-blue-500" />
                </div>
                <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                  <span className="text-sm font-medium text-gray-400">Architect is thinking...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-10 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/90 to-transparent">
          <form
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition duration-500" />
            <div className="relative flex items-center bg-[#161619] border border-white/10 rounded-[1.8rem] p-2 pr-4 shadow-2xl">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message AI Architect..."
                className="flex-1 bg-transparent border-none focus:ring-0 py-4 px-6 text-[15px] placeholder:text-gray-500"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={isLoading || !input.trim()}
                className="w-12 h-12 rounded-2xl bg-white text-[#0a0a0b] flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-xl"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
          <div className="text-center mt-4 text-[11px] text-gray-500 font-medium tracking-wide">
            Powered by LangGraph & Qdrant Engine
          </div>
        </div>
      </main>
      <AnimatePresence>
        {showTools && (
          <ToolsManager
            key="tools-modal"
            onClose={() => setShowTools(false)}
          />
        )}
        {showSettings && (
          <SettingsManager
            key="settings-modal"
            onClose={() => setShowSettings(false)}
          />
        )}
        {activeSource && (
          <SourceViewer
            key="source-viewer-modal"
            source={activeSource}
            onClose={() => setActiveSource(null)}
          />
        )}

        {/* Notifications */}
        {notification && (
          <motion.div
            key="notification-toast"
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={cn(
              "fixed bottom-32 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border text-sm font-medium flex items-center gap-3",
              notification.type === 'error'
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              notification.type === 'error' ? "bg-red-500" : "bg-blue-500"
            )} />
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
