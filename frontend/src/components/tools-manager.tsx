import React, { useState } from 'react';
import { useTools, ToolDefinition } from '@/hooks/use-tools';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, X, Plus, Trash2, Power, Check } from 'lucide-react';

export function ToolsManager({ onClose }: { onClose: () => void }) {
    const { tools, toggleTool, addTool, deleteTool } = useTools();
    const [isAdding, setIsAdding] = useState(false);
    const [newTool, setNewTool] = useState<Partial<ToolDefinition>>({
        name: '',
        description: '',
        type: 'custom',
        enabled: true,
        config: {}
    });

    const handleToggle = (id: string, current: boolean) => {
        toggleTool(id, !current);
    };

    const handleAdd = async () => {
        if (!newTool.name || !newTool.id) return;
        const success = await addTool(newTool as ToolDefinition);
        if (success) setIsAdding(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="bg-[#121214] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <Wrench className="text-white w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Tool Management</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {isAdding ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-200">Register New Tool</h3>
                            <div className="grid gap-4">
                                <input
                                    placeholder="Tool ID (e.g., weather-api)"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    value={newTool.id || ''}
                                    onChange={e => setNewTool({ ...newTool, id: e.target.value })}
                                />
                                <input
                                    placeholder="Name (e.g., Weather API)"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    value={newTool.name || ''}
                                    onChange={e => setNewTool({ ...newTool, name: e.target.value })}
                                />
                                <textarea
                                    placeholder="Description"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none h-24"
                                    value={newTool.description || ''}
                                    onChange={e => setNewTool({ ...newTool, description: e.target.value })}
                                />
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    value={newTool.type}
                                    onChange={e => setNewTool({ ...newTool, type: e.target.value as any })}
                                >
                                    <option value="custom">Custom (Function/API)</option>
                                    <option value="mcp">MCP (Model Context Protocol)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-gray-400 hover:bg-white/5 transition-colors">Cancel</button>
                                <button onClick={handleAdd} className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors">Register Tool</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tools.map(tool => (
                                <div key={tool.id} className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${tool.enabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-gray-200">{tool.name}</h4>
                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-gray-500 uppercase tracking-wider">{tool.type}</span>
                                            </div>
                                            <p className="text-sm text-gray-500 line-clamp-1">{tool.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggle(tool.id, tool.enabled)}
                                            className={`p-2 rounded-lg transition-colors ${tool.enabled ? 'text-green-400 bg-green-500/10' : 'text-gray-500 bg-white/5 hover:text-gray-300'}`}
                                            title={tool.enabled ? "Disable Tool" : "Enable Tool"}
                                        >
                                            <Power className="w-5 h-5" />
                                        </button>
                                        {tool.type !== 'system' && (
                                            <button
                                                onClick={() => deleteTool(tool.id)}
                                                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isAdding && (
                    <div className="p-6 border-t border-white/5 bg-white/2">
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Register New Tool
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
