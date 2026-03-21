import React from 'react';
import { Message, THEMES } from './types';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    showHeader: boolean;
    currentTheme: string;
}

export const MessageBubble: React.FC<MessageBubbleProps & { onReply?: (msg: Message) => void }> = ({ message, isOwn, showHeader, currentTheme, onReply }) => {
    const themeStyle = THEMES[currentTheme];
    const accentColor = currentTheme === 'default' ? 'text-theme-gold' : themeStyle.accent;
    const primaryColor = currentTheme === 'default' ? 'bg-theme-gold' : themeStyle.primary;

    const displayName = message.name || message.username || message.from;
    const isVIP = message.role === 'admin' || message.tags?.includes('VIP') || message.username === 'soberano';

    return (
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group/message`}>
            {showHeader && (
                <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <span className={`text-xs font-bold tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm ${currentTheme !== 'default' ? 'bg-slate-900/40 text-white' : (isOwn ? accentColor : 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800')}`}>
                        {isOwn ? 'Tú' : displayName}
                    </span>
                    {isVIP && !isOwn && (
                        <span className="text-[10px] font-bold text-theme-gold bg-theme-gold/10 px-1.5 py-0.5 rounded border border-theme-gold/20 flex items-center gap-1">
                            VIP
                        </span>
                    )}
                </div>
            )}
            <div className={`relative max-w-[85%] text-sm rounded-2xl shadow-sm transition-all duration-300 p-3 ${isOwn
                ? `${primaryColor} text-white rounded-tr-none shadow-md ${isVIP ? 'shadow-[0_0_15px_rgba(212,175,55,0.4)] border border-white/20' : ''}`
                : `bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border ${isVIP
                    ? 'border-theme-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                    : 'border-slate-200 dark:border-white/10'}`
                }`}>

                {/* Reply Context */}
                {message.replyTo && (
                    <div className={`mb-2 p-2 rounded-lg text-xs ${isOwn ? 'bg-black/10 text-white/90' : 'bg-slate-50 dark:bg-black/20 text-slate-600 dark:text-slate-300'} border-l-4 ${isOwn ? 'border-white/50' : 'border-theme-gold'}`}>
                        <div className="pl-1 flex flex-col gap-0.5">
                            <span className="font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-80">
                                {message.replyTo.name || message.replyTo.username}
                            </span>
                            <div className="truncate opacity-90 italic">"{message.replyTo.text}"</div>
                        </div>
                    </div>
                )}

                <div className="whitespace-pre-wrap break-words w-full">
                    {message.text}
                    <div className={`text-[9px] mt-1 opacity-70 ${isOwn ? 'text-white' : 'text-slate-400'} text-right block`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>

                {/* Reply Button (Hover) */}
                {!isOwn && onReply && (
                    <button
                        onClick={() => onReply(message)}
                        className="absolute -right-8 top-2 opacity-0 group-hover/message:opacity-100 p-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full hover:bg-theme-gold hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                        title="Responder"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 14l5-5-5-5" />
                            <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};
