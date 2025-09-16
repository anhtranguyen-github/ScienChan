import { useState, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    reasoning_steps?: string[];
    tools?: string[];
}

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
            await fetchEventSource('http://localhost:8000/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: content }),
                onmessage(msg) {
                    if (msg.event === 'FatalError') throw new Error(msg.data);

                    const data = JSON.parse(msg.data);

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
                                },
                            ];
                        });
                    } else if (data.type === 'tool_start') {
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
    }, []);

    return { messages, isLoading, sendMessage };
}
