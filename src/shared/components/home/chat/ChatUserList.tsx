import React from 'react';
import { MessageSquare, Crown } from 'lucide-react';
import { ConnectedUser, Message, THEMES } from './types';
import { User } from '../../../types/user';

interface ChatUserListProps {
    unreadCounts: Record<string, number>;
    lastGlobalMessage: Message | undefined | null;
    privateChatUsernames: string[];
    getLastPrivateMessage: (username: string) => Message | null | undefined;
    onlineUsers: ConnectedUser[];
    allUsers: User[];
    currentUser: User;
    onOpenChat: (chatId: string) => void;
    currentTheme: string;
}

export const ChatUserList: React.FC<ChatUserListProps> = ({
    unreadCounts, lastGlobalMessage, privateChatUsernames, getLastPrivateMessage,
    onlineUsers, allUsers, currentUser, onOpenChat, currentTheme
}) => {

    const themeStyle = THEMES[currentTheme];
    const accentColor = currentTheme === 'default' ? 'text-theme-gold' : themeStyle.accent;

    // Helper to get User info wrapper
    const getUserInfo = (username: string) => {
        const u = Array.isArray(allUsers) ? allUsers.find(au => au.username === username) : null;
        // Build fallback display logic if user not found in static list but exists in messages
        return {
            name: u?.name || username,
            username: username,
            role: u?.role || 'user',
            tags: u?.tags || [],
            avatar: u?.avatar
        };
    };

    return (
        <div className="p-2 space-y-2 relative z-10">
            {/* Global Chat Row */}
            <div
                onClick={() => onOpenChat('global')}
                className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accentColor} bg-opacity-20`}>
                    <MessageSquare size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Sala Común</h4>
                        {(unreadCounts['global'] || 0) > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {unreadCounts['global']}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {lastGlobalMessage?.text || 'No hay mensajes recientes'}
                    </p>
                </div>
            </div>

            <div className="my-2 border-t border-slate-200 dark:border-white/5"></div>
            <h4 className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Privados</h4>

            {privateChatUsernames.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-4">No tienes chats privados.</p>
            )}

            {privateChatUsernames.map(username => {
                const lastMsg = getLastPrivateMessage(username);
                const unread = unreadCounts[username] || 0;
                const uInfo = getUserInfo(username);
                const isOnline = onlineUsers.some(ou => ou.username === username);
                const isVIP = uInfo.username.toLowerCase() === 'soberano' || uInfo.role === 'admin' || (uInfo.tags as string[])?.includes('VIP');

                return (
                    <div
                        key={username}
                        onClick={() => onOpenChat(username)}
                        className={`bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isVIP ? 'border-theme-gold/50 bg-amber-50/50 dark:bg-amber-900/10' : 'border-slate-100 dark:border-white/5'
                            }`}
                    >
                        <div className="relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isVIP ? 'bg-theme-gold text-black ring-2 ring-theme-gold ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                }`}>
                                {uInfo.name.charAt(0)}
                            </div>
                            {isOnline && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                            )}
                            {isVIP && (
                                <span className="absolute -top-1 -right-1 text-theme-gold drop-shadow-sm">
                                    <Crown size={12} fill="currentColor" />
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                                <div className="flex items-center gap-1.5">
                                    <h4 className={`font-bold text-sm ${isVIP ? 'text-theme-gold' : 'text-slate-900 dark:text-white'}`}>
                                        {uInfo.name}
                                    </h4>
                                    {isVIP && <Crown size={10} className="text-theme-gold" />}
                                </div>
                                {unread > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {unread}
                                    </span>
                                )}
                            </div>
                            <p className={`text-xs truncate ${unread > 0 ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                                {lastMsg?.text || '...'}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
