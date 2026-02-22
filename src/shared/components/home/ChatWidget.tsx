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

interface ChatWidgetProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
}

const SOCKET_URL = '';

export const ChatWidget: React.FC<ChatWidgetProps> = ({ user, isOpen, onClose }) => {
    // Custom Hook handles socket logic
    const chat = useChat(user);

    // UI State
    // 'LIST' = Main Menu, 'CHAT' = Conversation, 'DIRECTORY' = New Chat
    const [view, setView] = useState<'LIST' | 'CHAT' | 'DIRECTORY'>('LIST');
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
        if (view === 'CHAT') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chat.messages, chat.privateMessages, activeChat, view, isOpen]);

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

                        <ChatInput
                            onSend={handleSend}
                            currentTheme={currentTheme}
                            replyTo={replyTo}
                            onCancelReply={() => setReplyTo(null)}
                        />
                    </div>
                )}

            </div>
        </div>
    );
};
