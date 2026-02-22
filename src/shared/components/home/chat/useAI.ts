import { useState } from 'react';
import { apiFetch } from '../../../utils/apiFetch';

export interface AIMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const useAI = () => {
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [isThinking, setIsThinking] = useState(false);

    const askAI = async (message: string, userId: string) => {
        setIsThinking(true);
        // Add user message optimistically
        const newUserMsg: AIMessage = { role: 'user', content: message };
        setMessages(prev => [...prev, newUserMsg]);

        try {
            const response = await apiFetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, userId })
            });

            const data = await response.json();

            if (data.response) {
                const aiMsg: AIMessage = { role: 'assistant', content: data.response };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error al procesar tu solicitud.' }]);
            }
        } catch (error) {
            console.error('[AI HOOK ERROR]', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'No pude contactar con Magnus AI.' }]);
        } finally {
            setIsThinking(false);
        }
    };

    const clearChat = () => setMessages([]);

    return {
        messages,
        isThinking,
        askAI,
        clearChat
    };
};
