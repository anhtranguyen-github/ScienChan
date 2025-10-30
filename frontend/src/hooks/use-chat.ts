import { useState, useCallback, useEffect } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { API_ROUTES } from '@/lib/api-config';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    reasoning_steps?: string[];
    tools?: string[];
    sources?: Array<{ id: number, name: string, content: string }>;
}

export function useChat(workspaceId: string = "default") {
    const [messages, setMessages] = useState<Message[]>([]);
    const [threadId, setThreadId] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('chat_thread_id');
            if (saved) return saved;
            const newId = Math.random().toString(36).substring(7);
            localStorage.setItem('chat_thread_id', newId);
            return newId;
        }
        return 'default';
    });
    const [isLoading, setIsLoading] = useState(false);

    const fetchHistory = useCallback(async (id: string) => {
        try {
            const res = await fetch(API_ROUTES.CHAT_HISTORY(id));
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
            }
        } catch (err) {
            console.error('Failed to fetch chat history:', err);
        }
    }, []);

    useEffect(() => {
        if (threadId) {
            fetchHistory(threadId);
        }
    }, [threadId, fetchHistory]);

    const clearChat = useCallback(() => {
        setMessages([]);
        const newId = Math.random().toString(36).substring(7);
        setThreadId(newId);
        localStorage.setItem('chat_thread_id', newId);
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        const assistantMessageId = (Date.now() + 1).toString();
        let accumulatedContent = '';

        try {
            await fetchEventSource(API_ROUTES.CHAT_STREAM, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: content,
                    thread_id: threadId,
                    workspace_id: workspaceId
                }),
                onmessage(msg) {
                    if (msg.event === 'FatalError') throw new Error(msg.data);

                    const data = JSON.parse(msg.data);
                    console.log("[SSE Event]", data.type, data);

                    if (data.type === 'content') {
                        accumulatedContent += data.delta;
                        setMessages((prev) => {
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            return [
                                ...otherMessages,
                                {
                                    id: assistantMessageId,
                                    role: 'assistant',
                                    content: accumulatedContent,
                                    reasoning_steps: lastMsg?.reasoning_steps,
                                    tools: lastMsg?.tools,
                                    sources: lastMsg?.sources,
                                },
                            ];
                        });
                    } else if (data.type === 'reasoning') {
                        setMessages((prev) => {
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            return [
                                ...otherMessages,
                                {
                                    id: assistantMessageId,
                                    role: 'assistant',
                                    content: lastMsg?.content || '',
                                    reasoning_steps: data.steps,
                                    tools: lastMsg?.tools,
                                    sources: lastMsg?.sources,
                                },
                            ];
                        });
                    }
                    else if (data.type === 'tool_start') {
                        setMessages((prev) => {
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            return [
                                ...otherMessages,
                                {
                                    id: assistantMessageId,
                                    role: 'assistant',
                                    content: lastMsg?.content || '',
                                    reasoning_steps: lastMsg?.reasoning_steps,
                                    tools: [...(lastMsg?.tools || []), `Running ${data.tool}...`],
                                    sources: lastMsg?.sources,
                                },
                            ];
                        });
                    } else if (data.type === 'sources') {
                        setMessages((prev) => {
                            const otherMessages = prev.filter((m) => m.id !== assistantMessageId);
                            const lastMsg = prev.find((m) => m.id === assistantMessageId);
                            return [
                                ...otherMessages,
                                {
                                    id: assistantMessageId,
                                    role: 'assistant',
                                    content: lastMsg?.content || '',
                                    reasoning_steps: lastMsg?.reasoning_steps,
                                    tools: lastMsg?.tools,
                                    sources: data.sources,
                                },
                            ];
                        });
                    }
                },
                onclose() {
                    setIsLoading(false);
                },
                onerror(err) {
                    console.error('SSE Error:', err);
                    setIsLoading(false);
                    throw err;
                },
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsLoading(false);
        }
    }, [threadId, workspaceId]);

    return { messages, isLoading, sendMessage, clearChat, threadId, setThreadId };
}
