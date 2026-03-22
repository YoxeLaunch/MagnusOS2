import { useState } from 'react';
import { apiFetch } from '../../../utils/apiFetch';

export interface AIMessage {
    role: 'user' | 'assistant';
    content: string;
    mode?: 'chat' | 'quick' | 'deep';
    cached?: boolean;
    tokens_used?: number;
    structured?: any;
}

export interface AISendOptions {
    content: string;
    mode: 'chat' | 'quick' | 'deep';
    period?: string; // YYYY-MM format, optional for deep mode
}

export const useAI = () => {
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingMode, setThinkingMode] = useState<'chat' | 'quick' | 'deep'>('chat');

    const askAI = async (options: AISendOptions, userId: string) => {
        const { content, mode = 'chat', period } = options;
        setIsThinking(true);
        setThinkingMode(mode);

        // Add user message optimistically (only for chat/quick, deep shows its own panel)
        const newUserMsg: AIMessage = { role: 'user', content, mode };
        setMessages(prev => [...prev, newUserMsg]);

        try {
            const response = await apiFetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content,
                    userId,
                    mode,
                    period: period || null,
                    history: messages.slice(-4).map(m => ({ role: m.role, content: m.content }))
                })
            });

            const data = await response.json();

            if (response.status === 429) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '⚠️ **Límite diario alcanzado** — Has usado tus 10 análisis profundos de hoy. Vuelve mañana o usa el modo Chat.',
                    mode
                }]);
                return;
            }

            if (data.response) {
                const aiMsg: AIMessage = {
                    role: 'assistant',
                    content: data.response,
                    mode,
                    cached: data.cached || false,
                    tokens_used: data.tokens_used,
                    structured: data.structured || null
                };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Lo siento, hubo un error al procesar tu solicitud.',
                    mode
                }]);
            }
        } catch (error) {
            console.error('[AI HOOK ERROR]', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ No pude contactar con Magnus AI. Verifica la conexión.',
                mode
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const clearChat = () => setMessages([]);

    return {
        messages,
        isThinking,
        thinkingMode,
        askAI,
        clearChat
    };
};
