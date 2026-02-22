import React from 'react';
import { MessageSquare, Minimize2, X, Palette, Crown, User as UserIcon } from 'lucide-react';
import { User } from '../../../types/user';
import { ConnectedUser, THEMES } from './types';

interface ChatHeaderProps {
    view: 'LIST' | 'CHAT' | 'DIRECTORY' | 'AI';
    setView: (view: 'LIST' | 'CHAT' | 'DIRECTORY' | 'AI') => void;
    activeChat: string | null;
    activeChatName: string;
    onlineCount: number;
    isVIP: boolean;
    showThemePicker: boolean;
    setShowThemePicker: (show: boolean) => void;
    currentTheme: string;
    setCurrentTheme: (theme: string) => void;
    onClose: () => void;
    onMinimize: () => void;
    user: User;
    saveThemePreference: (theme: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    view, setView, activeChat, activeChatName, onlineCount, isVIP,
    showThemePicker, setShowThemePicker, currentTheme, setCurrentTheme,
    onClose, onMinimize, user, saveThemePreference
}) => {

    const themeStyle = THEMES[currentTheme];
    const accentColor = currentTheme === 'default' ? 'text-theme-gold' : themeStyle.accent;

    return (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                {view !== 'LIST' ? (
                    <button onClick={() => setView('LIST')} className="hover:bg-black/5 dark:hover:bg-white/10 p-1 rounded-full">
                        <span className="text-xl">←</span>
                    </button>
                ) : (
                    <MessageSquare className={accentColor} size={20} />
                )}

                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                        {view === 'DIRECTORY' ? 'Nueva Conversación' :
                            view === 'AI' ? 'Analista IA (Qwen 2.5)' :
                                view === 'CHAT' ? (activeChat === 'global' ? 'Sala Común' : activeChatName) :
                                    'Mensajes'}
                    </h3>
                    {view === 'LIST' && (
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                            ● {onlineCount} usuarios en línea
                        </p>
                    )}
                    {view === 'CHAT' && activeChat === 'global' && (
                        <span className="text-xs text-green-500">{onlineCount} en línea</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isVIP && view === 'LIST' && (
                    <div className="relative">
                        <button
                            onClick={() => setShowThemePicker(!showThemePicker)}
                            className={`p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors ${accentColor}`}
                            title="Temas VIP"
                        >
                            <Palette size={16} />
                        </button>

                        {showThemePicker && (
                            <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Temas Exclusivos</h4>
                                <div className="space-y-1">
                                    {Object.keys(THEMES).map(theme => (
                                        <button
                                            key={theme}
                                            onClick={() => {
                                                setCurrentTheme(theme);
                                                setShowThemePicker(false);
                                                saveThemePreference(theme);
                                            }}
                                            className={`w-full text-left px-2 py-1.5 text-xs rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 ${currentTheme === theme ? 'bg-slate-100 dark:bg-white/10 font-bold' : ''}`}
                                        >
                                            <span className={`w-3 h-3 rounded-full border border-slate-300 ${theme === 'sakura' ? 'bg-pink-300' :
                                                theme === 'gothic' ? 'bg-slate-900' :
                                                    theme === 'luxury' ? 'bg-yellow-500' :
                                                        theme === 'cyber' ? 'bg-cyan-500' :
                                                            theme === 'zen' ? 'bg-green-500' :
                                                                theme === 'ocean' ? 'bg-blue-600' : 'bg-white'
                                                }`}></span>
                                            <span className="capitalize">{theme}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {view === 'LIST' && (
                    <button
                        onClick={() => setView('DIRECTORY')}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500"
                        title="Nuevo Chat"
                    >
                        <UserIcon size={16} />
                    </button>
                )}
                <button onClick={onMinimize} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-500">
                    <Minimize2 size={16} />
                </button>
                <button onClick={onClose} className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-slate-500">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
