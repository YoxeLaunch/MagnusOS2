import React from 'react';
import { Crown } from 'lucide-react';
import { ConnectedUser } from './types';
import { User } from '../../../types/user';
import { UserAvatar } from '../../UserAvatar';

interface ChatDirectoryProps {
    onlineUsers: ConnectedUser[];
    allUsers: User[];
    currentUser: User;
    onOpenChat: (username: string) => void;
}

export const ChatDirectory: React.FC<ChatDirectoryProps> = ({ onlineUsers, allUsers, currentUser, onOpenChat }) => {
    return (
        <div className="p-4 space-y-4">
            {/* Online Users */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">En Línea ({onlineUsers.length})</h4>
                <div className="space-y-2">
                    <div className="space-y-2">
                        {onlineUsers.filter(u => u.username !== currentUser.username).map((u) => {
                            return (
                                <div
                                    key={u.username}
                                    onClick={() => onOpenChat(u.username)}
                                    className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl cursor-pointer flex items-center gap-3 group transition-all"
                                >
                                    <div className="relative">
                                        <UserAvatar user={u as unknown as User} className="w-10 h-10" showBorder={(u.tags as string[])?.includes('VIP') || u.role === 'admin' || u.username === 'soberano'} />
                                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${u.status === 'online' ? 'bg-green-500' : 'bg-slate-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800 dark:text-gray-200 truncate flex items-center gap-1">
                                                {u.name}
                                                {(u.role === 'admin' || u.username === 'soberano' || (u.tags as string[])?.includes('VIP')) && (
                                                    <Crown size={12} className="text-theme-gold fill-theme-gold" />
                                                )}
                                            </h4>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Offline Users */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Otros Usuarios</h4>
                <div className="space-y-2 opacity-80">
                    {allUsers.filter(u => !onlineUsers.some(ou => ou.username === u.username) && u.username !== currentUser.username).map((u) => {
                        const isVIP = u.username.toLowerCase() === 'soberano' || u.role === 'user' && u.tags?.includes('VIP'); // Simple check from original logic
                        return (
                            <div
                                key={u.username}
                                onClick={() => onOpenChat(u.username)}
                                className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                            >
                                <div className="relative">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isVIP ? 'bg-theme-gold text-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                                        }`}>
                                        {u.name.charAt(0)}
                                    </div>
                                </div>
                                <span className={`text-sm ${isVIP ? 'text-theme-gold font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {u.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
