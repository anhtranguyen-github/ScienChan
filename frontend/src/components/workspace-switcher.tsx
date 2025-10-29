'use client';

import React, { useState } from 'react';
import { Workspace } from '@/hooks/use-workspaces';
import { ChevronDown, Plus, Layout, Check, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceSwitcherProps {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    onSelect: (ws: Workspace) => void;
    onCreate: (name: string) => void;
}

export function WorkspaceSwitcher({
    workspaces,
    currentWorkspace,
    onSelect,
    onCreate
}: WorkspaceSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newWsName, setNewWsName] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newWsName.trim()) {
            onCreate(newWsName);
            setNewWsName('');
            setIsCreating(false);
        }
    };

    return (
        <div className="relative relative-z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
            >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shrink-0">
                    <Layout size={16} />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Workspace</div>
                    <div className="text-sm font-semibold truncate text-gray-200">
                        {currentWorkspace?.name || 'Select Workspace'}
                    </div>
                </div>
                <ChevronDown size={16} className={cn("text-gray-500 transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1e] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                            <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {workspaces.map((ws) => (
                                    <button
                                        key={ws.id}
                                        onClick={() => {
                                            onSelect(ws);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between w-full p-3 rounded-xl transition-all mb-1",
                                            ws.id === currentWorkspace?.id
                                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20"
                                                : "text-gray-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                                            <span className="text-sm font-medium truncate">{ws.name}</span>
                                            <span className="text-[10px] opacity-50 font-mono uppercase tracking-tighter">{ws.id}</span>
                                        </div>
                                        {ws.id === currentWorkspace?.id && <Check size={14} />}
                                    </button>
                                ))}
                            </div>

                            <div className="p-2 border-t border-white/5 bg-white/5">
                                {isCreating ? (
                                    <form onSubmit={handleCreate} className="space-y-2 p-2">
                                        <input
                                            autoFocus
                                            value={newWsName}
                                            onChange={(e) => setNewWsName(e.target.value)}
                                            placeholder="Workspace name..."
                                            className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl px-3 py-2 text-sm focus:ring-1 ring-indigo-500 outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg transition-all"
                                            >
                                                Create
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsCreating(false)}
                                                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold py-2 rounded-lg transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => setIsCreating(true)}
                                            className="flex items-center gap-2 w-full p-3 rounded-xl hover:bg-white/5 text-xs font-bold text-indigo-400 transition-all"
                                        >
                                            <Plus size={14} />
                                            New Workspace
                                        </button>
                                        <a
                                            href="/workspaces"
                                            className="flex items-center gap-2 w-full p-3 rounded-xl hover:bg-white/5 text-xs font-bold text-gray-500 hover:text-white transition-all border-t border-white/5"
                                        >
                                            <Settings size={14} />
                                            Manage Workspaces
                                        </a>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
