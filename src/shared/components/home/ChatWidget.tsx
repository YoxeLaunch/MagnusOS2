import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { User } from '../../types/user';
import { Message } from './chat/types'; // Import Message type
import { useChat } from './chat/useChat';
import { ChatHeader } from './chat/ChatHeader';
import { ChatUserList } from './chat/ChatUserList';
import { ChatDirectory } from './chat/ChatDirectory';
import { MessageBubble } from './chat/MessageBubble';
import { ChatInput } from './chat/ChatInput';
import { THEMES } from './chat/types';
import { apiFetch } from '../../utils/apiFetch';
import { useAI } from './chat/useAI';
import { Sparkles } from 'lucide-react';

interface ChatWidgetProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
}

const SOCKET_URL = '';

export const ChatWidget: React.FC<ChatWidgetProps> = ({ user, isOpen, onClose }) => {
    // Custom Hook handles socket logic
    const chat = useChat(user);
    const ai = useAI();

    // UI State
    // 'LIST' = Main Menu, 'CHAT' = Conversation, 'DIRECTORY' = New Chat, 'AI' = AI Analyst
    const [view, setView] = useState<'LIST' | 'CHAT' | 'DIRECTORY' | 'AI'>('LIST');
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    // Theme State
    const [currentTheme, setCurrentTheme] = useState<string>(user.preferences?.chatTheme || 'default');
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [replyTo, setReplyTo] = useState<Message | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        if (isOpen) {
            apiFetch(`/api/users`)
                .then(res => res.json())
                .then((data: User[]) => {
                    const userList = Array.isArray(data) ? data : [];
                    setAllUsers(userList);
                    const me = userList.find(u => u.username === user.username);
                    if (me?.preferences?.chatTheme) {
                        setCurrentTheme(me.preferences.chatTheme);
                    }
                })
                .catch(err => {
                    console.error('Error fetching users:', err);
                    setAllUsers([]);
                });
        }
    }, [isOpen, user.username]);

    // Auto-scroll logic
    useEffect(() => {
        if (view === 'CHAT' || view === 'AI') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chat.messages, chat.privateMessages, ai.messages, activeChat, view, isOpen]);

    // Save Theme Preference
    const saveTheme = (newTheme: string) => {
        apiFetch(`${SOCKET_URL}/api/users/${user.username}/preferences`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferences: { chatTheme: newTheme } })
        }).catch(err => console.error('Error saving theme:', err));
    };

    // Navigation Handlers
    const handleOpenChat = (chatId: string) => {
        setActiveChat(chatId);
        setView('CHAT');
        setReplyTo(null); // Clear reply when changing chat
        chat.clearUnread(chatId);
        if (chatId !== 'global') {
            chat.loadPrivateHistory(chatId);
        }
    };

    const handleSend = (text: string) => {
        if (activeChat && activeChat !== 'global') {
            chat.sendPrivateMessage(activeChat, text, replyTo);
        } else {
            chat.sendMessage(text, replyTo);
        }
        setReplyTo(null);
    };

    // Helper for display
    const getActiveChatName = () => {
        if (activeChat === 'global') return 'Sala Común';
        const u = Array.isArray(allUsers) ? allUsers.find(u => u.username === activeChat) : null;
        return u?.name || activeChat || 'Chat';
    };

    const getLastMessage = (chatId: string) => {
        if (chatId === 'global') return chat.messages[chat.messages.length - 1];
        const pChat = chat.privateMessages[chatId];
        return pChat ? pChat[pChat.length - 1] : null;
    };

    const isVIP = user.username.toLowerCase() === 'soberano' || user.role === 'admin' || user.tags?.includes('VIP');
    const privateChatUsernames = Object.keys(chat.privateMessages);

    // Theme Styles
    const themeStyle = THEMES[currentTheme];
    const containerStyle = (currentTheme !== 'default' && view === 'CHAT') ? {
        backgroundImage: `url(${themeStyle.bg})`,
        backgroundSize: '300px',
        backgroundRepeat: 'repeat'
    } : {};

    if (!isOpen) return null;

    if (isMinimized) {
        const totalUnread = Object.values(chat.unreadCounts).reduce((a, b) => a + b, 0);
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-theme-gold rounded-full shadow-lg border border-theme-gold/30 hover:scale-110 transition-transform flex items-center gap-2 animate-fade-in"
            >
                <div className="relative">
                    <MessageSquare size={24} />
                    {(totalUnread > 0) && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold animate-bounce">
                            {totalUnread > 9 ? '9+' : totalUnread}
                        </span>
                    )}
                </div>
                <span className="font-bold hidden md:block">Chat</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-theme-gold/20 flex flex-col overflow-hidden z-50 animate-slide-up font-sans">

            <ChatHeader
                view={view}
                setView={setView}
                activeChat={activeChat}
                activeChatName={getActiveChatName()}
                onlineCount={chat.onlineUsers.length}
                isVIP={!!isVIP}
                showThemePicker={showThemePicker}
                setShowThemePicker={setShowThemePicker}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
                onClose={onClose}
                onMinimize={() => setIsMinimized(true)}
                user={user}
                saveThemePreference={saveTheme}
            />

            {/* CONTENT AREA */}
            <div
                className={`flex-1 overflow-y-auto bg-slate-50/30 dark:bg-black/20 relative transition-all duration-500`}
                style={containerStyle}
            >
                {/* Theme Overlay */}
                {currentTheme !== 'default' && view === 'CHAT' && (
                    <div className={`absolute inset-0 pointer-events-none ${currentTheme === 'sakura' ? 'bg-white/60' :
                        currentTheme === 'gothic' ? 'bg-black/60' :
                            currentTheme === 'luxury' ? 'bg-black/70' :
                                currentTheme === 'cyber' ? 'bg-slate-900/70' :
                                    currentTheme === 'zen' ? 'bg-white/50' :
                                        currentTheme === 'ocean' ? 'bg-slate-900/60' : ''
                        }`}></div>
                )}

                {view === 'LIST' && (
                    <div className="flex flex-col h-full">
                        <button
                            onClick={() => setView('AI')}
                            className="m-4 p-4 bg-gradient-to-r from-theme-gold/20 to-purple-500/20 border border-theme-gold/30 rounded-2xl flex items-center justify-between hover:scale-[1.02] transition-transform group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-theme-gold rounded-xl text-slate-900 shadow-lg group-hover:rotate-12 transition-transform">
                                    <Sparkles size={20} />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Consultar Analista IA</h4>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Análisis financiero local y privado</p>
                                </div>
                            </div>
                            <span className="text-theme-gold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </button>

                        <ChatUserList
                            unreadCounts={chat.unreadCounts}
                            lastGlobalMessage={getLastMessage('global')}
                            privateChatUsernames={privateChatUsernames}
                            getLastPrivateMessage={getLastMessage}
                            onlineUsers={chat.onlineUsers}
                            allUsers={allUsers}
                            currentUser={user}
                            onOpenChat={handleOpenChat}
                            currentTheme={currentTheme}
                        />
                    </div>
                )}

                {view === 'DIRECTORY' && (
                    <ChatDirectory
                        onlineUsers={chat.onlineUsers}
                        allUsers={allUsers}
                        currentUser={user}
                        onOpenChat={(username) => {
                            handleOpenChat(username);
                            chat.clearUnread(username);
                        }}
                    />
                )}

                {view === 'AI' && (
                    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {ai.messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-60">
                                    <div className="w-16 h-16 bg-theme-gold/20 rounded-full flex items-center justify-center text-theme-gold">
                                        <Sparkles size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-slate-900 dark:text-white">Analista IA Local</h4>
                                        <p className="text-xs text-slate-500 max-w-[200px]">
                                            Haz preguntas sobre tus gastos, proyecciones o pide análisis de tendencias. Todo procesado localmente.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {ai.messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                        ? 'bg-slate-900 dark:bg-theme-gold text-white dark:text-slate-900 shadow-md'
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-white/5 shadow-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {ai.isThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <ChatInput
                            onSend={(text) => ai.askAI(text, user.username)}
                            currentTheme={currentTheme}
                            replyTo={null}
                            onCancelReply={() => { }}
                            onTyping={() => { }}
                            onStopTyping={() => { }}
                        />
                    </div>
                )}

                {view === 'CHAT' && activeChat && (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {((activeChat === 'global' ? chat.messages : chat.privateMessages[activeChat]) || []).map((msg, idx) => {
                                const currentList = (activeChat === 'global' ? chat.messages : chat.privateMessages[activeChat]) || [];
                                const isOwn = msg.username === user.username || msg.from === user.username;
                                const msgUsername = msg.username || msg.from;

                                const showHeader = idx === 0 ||
                                    (currentList[idx - 1].username || currentList[idx - 1].from) !== msgUsername ||
                                    (new Date(msg.timestamp).getTime() - new Date(currentList[idx - 1].timestamp).getTime() > 60000);

                                return (
                                    <MessageBubble
                                        key={msg.id || idx} // Fallback to idx if id missing
                                        message={msg}
                                        isOwn={isOwn}
                                        showHeader={showHeader}
                                        currentTheme={currentTheme}
                                        onReply={setReplyTo}
                                    />
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Typing Indicator */}
                        {activeChat && chat.typers[activeChat]?.length > 0 && (
                            <div className="px-4 py-1 animate-pulse">
                                <p className="text-[10px] text-slate-400 font-medium italic">
                                    {chat.typers[activeChat].length === 1
                                        ? `${chat.typers[activeChat][0]} está escribiendo...`
                                        : `${chat.typers[activeChat].join(', ')} están escribiendo...`
                                    }
                                </p>
                            </div>
                        )}

                        <ChatInput
                            onSend={handleSend}
                            currentTheme={currentTheme}
                            replyTo={replyTo}
                            onCancelReply={() => setReplyTo(null)}
                            onTyping={() => chat.emitTyping(activeChat)}
                            onStopTyping={() => chat.emitStopTyping(activeChat)}
                        />
                    </div>
                )}

            </div>
        </div>
    );
};
