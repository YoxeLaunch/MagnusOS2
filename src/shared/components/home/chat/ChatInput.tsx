import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { THEMES, Message } from './types';

interface ChatInputProps {
    onSend: (text: string) => void;
    currentTheme: string;
    replyTo: Message | null;
    onCancelReply: () => void;
    onTyping: () => void;
    onStopTyping: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, currentTheme, replyTo, onCancelReply, onTyping, onStopTyping }) => {
    const [input, setInput] = useState('');
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef(false);

    const themeStyle = THEMES[currentTheme];
    const accentColor = currentTheme === 'default' ? 'text-theme-gold' : themeStyle.accent;
    const primaryColor = currentTheme === 'default' ? 'bg-theme-gold' : themeStyle.primary;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            onTyping();
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            onStopTyping();
        }, 2000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSend(input);
            setInput('');
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            isTypingRef.current = false;
            onStopTyping();
        }
    };

    return (
        <div className="flex flex-col bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5">
            {replyTo && (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-b border-slate-100 dark:border-white/5 animate-fade-in">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`w-1 h-8 rounded-full ${primaryColor}`}></div>
                        <div className="flex flex-col text-xs overflow-hidden">
                            <span className={`font-bold ${accentColor}`}>
                                Respondiendo a {replyTo.name || replyTo.username}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                                {replyTo.text}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onCancelReply}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit} className="p-3 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Escribe un mensaje..."
                    className={`flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 outline-none dark:text-white placeholder-slate-400 transition-all ${currentTheme === 'default' ? 'focus:ring-theme-gold' : `focus:ring-opacity-50 ${accentColor.replace('text-', 'focus:ring-')}`}`}
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    className={`p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg ${primaryColor} text-white`}
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};
