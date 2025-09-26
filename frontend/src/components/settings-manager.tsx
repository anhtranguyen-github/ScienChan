import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, Cpu, Search, Layout, Save, Loader2 } from 'lucide-react';
import { useSettings, AppSettings } from '@/hooks/use-settings';

export function SettingsManager({ onClose }: { onClose: () => void }) {
    const { settings, updateSettings, isLoading } = useSettings();
    const [localSettings, setLocalSettings] = useState<Partial<AppSettings>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'llm' | 'retrieval' | 'system'>('llm');

    if (isLoading || !settings) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const current = { ...settings, ...localSettings };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateSettings(localSettings);
            setLocalSettings({});
            onClose();
        } catch (err) {
            alert('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key: keyof AppSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="bg-[#121214] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Settings className="text-blue-400 w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Application Settings</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* Sidebar Tabs */}
                    <div className="w-48 border-r border-white/5 p-4 flex flex-col gap-2">
                        <button
                            onClick={() => setActiveTab('llm')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'llm' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'hover:bg-white/5 text-gray-400'}`}
                        >
                            <Cpu size={18} />
                            <span className="text-sm font-medium">Models</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('retrieval')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'retrieval' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'hover:bg-white/5 text-gray-400'}`}
                        >
                            <Search size={18} />
                            <span className="text-sm font-medium">Retrieval</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('system')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'system' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'hover:bg-white/5 text-gray-400'}`}
                        >
                            <Layout size={18} />
                            <span className="text-sm font-medium">System</span>
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        {activeTab === 'llm' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">LLM Provider</label>
                                    <select
                                        value={current.llm_provider}
                                        onChange={e => handleChange('llm_provider', e.target.value)}
                                        className="w-full bg-[#1e1e21] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 outline-none focus:border-blue-500/50 transition-colors"
                                    >
                                        <option value="openai">OpenAI</option>
                                        <option value="anthropic">Anthropic</option>
                                        <option value="ollama">Ollama</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Model Name</label>
                                    <input
                                        type="text"
                                        value={current.llm_model}
                                        onChange={e => handleChange('llm_model', e.target.value)}
                                        className="w-full bg-[#1e1e21] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 outline-none focus:border-blue-500/50 transition-colors"
                                        placeholder="e.g. gpt-4o"
                                    />
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Embedding Provider</label>
                                    <select
                                        value={current.embedding_provider}
                                        onChange={e => handleChange('embedding_provider', e.target.value)}
                                        className="w-full bg-[#1e1e21] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 outline-none focus:border-blue-500/50 transition-colors"
                                    >
                                        <option value="openai">OpenAI</option>
                                        <option value="voyage">Voyage AI</option>
                                        <option value="local">Local (HuggingFace)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeTab === 'retrieval' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Retrieval Mode</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['hybrid', 'vector', 'keyword'].map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => handleChange('retrieval_mode', mode)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${current.retrieval_mode === mode ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                                            >
                                                {mode.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-[10px] text-gray-500 italic">
                                        Hybrid combines semantic understanding with exact matching for best results.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
                                        <span>Search Limit (Top-K)</span>
                                        <span className="text-blue-400">{current.search_limit}</span>
                                    </label>
                                    <input
                                        type="range" min="1" max="20" step="1"
                                        value={current.search_limit}
                                        onChange={e => handleChange('search_limit', parseInt(e.target.value))}
                                        className="w-full accent-blue-500"
                                    />
                                </div>
                                {current.retrieval_mode === 'hybrid' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
                                            <span>Hybrid Alpha (Vector vs Keyword)</span>
                                            <span className="text-blue-400">{current.hybrid_alpha}</span>
                                        </label>
                                        <input
                                            type="range" min="0" max="1" step="0.1"
                                            value={current.hybrid_alpha}
                                            onChange={e => handleChange('hybrid_alpha', parseFloat(e.target.value))}
                                            className="w-full accent-blue-500"
                                        />
                                        <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase font-mono">
                                            <span>Keyword</span>
                                            <span>Vector</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Show Reasoning</h4>
                                        <p className="text-[11px] text-gray-500">Toggle "AI Thinking" process visibility.</p>
                                    </div>
                                    <button
                                        onClick={() => handleChange('show_reasoning', !current.show_reasoning)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${current.show_reasoning ? 'bg-blue-500' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${current.show_reasoning ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex justify-end items-center gap-4 bg-white/2">
                    <button onClick={onClose} className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || Object.keys(localSettings).length === 0}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
