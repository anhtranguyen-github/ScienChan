'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Trash2, Cpu, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPage() {
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-white overflow-hidden font-sans">
      {/* Sidebar - Modern Dark Glass */}
      <aside className="w-72 bg-[#121214] border-r border-white/5 flex flex-col p-6 gap-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cpu size={22} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">AI Architect</span>
        </div>

        <button className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group">
          <Trash2 size={18} className="text-gray-400 group-hover:text-white" />
          <span className="text-sm font-medium">Clear Conversations</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-2 py-4">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-4">Recent History</div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            New Workspace Chat
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
            <div className="w-2h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-lg font-semibold">Active Session</h2>
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
                  <h1 className="text-4xl font-bold mb-4 tracking-tight">How can I help you build today?</h1>
                  <p className="text-gray-400 leading-relaxed text-lg">
                    I'm your agentic reasoning assistant. I can search the web, calculate complex math, and build apps with you in real-time.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  {['Research Next.js architecture', 'Calculate mortgage rates', 'Analyze current market trends', 'Debug Python graph logic'].map((tip) => (
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
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-start gap-5 max-w-4xl mx-auto",
                  message.role === 'user' ? "flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                  message.role === 'user' ? "bg-purple-600 shadow-purple-500/20" : "bg-[#1e1e21] border border-white/10 shadow-black/40"
                )}>
                  {message.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-blue-500" />}
                </div>

                <div className={cn(
                  "p-6 rounded-3xl leading-relaxed text-[15px] shadow-sm",
                  message.role === 'user'
                    ? "bg-[#1e1e21] border border-purple-500/20 text-gray-100 rounded-tr-none"
                    : "bg-[#161619] border border-white/5 text-gray-200 rounded-tl-none"
                )}>
                  {message.content}
                </div>
              </motion.div>
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
    </div>
  );
}
