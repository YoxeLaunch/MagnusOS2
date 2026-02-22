import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message, ConnectedUser } from './types';

export const useChat = (user: { username: string; name: string }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [privateMessages, setPrivateMessages] = useState<Record<string, Message[]>>({});
    const [onlineUsers, setOnlineUsers] = useState<ConnectedUser[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [typers, setTypers] = useState<Record<string, string[]>>({}); // Room -> [usernames]

    useEffect(() => {
        // Use relative path for socket connection (handled by Vite proxy)
        const newSocket = io();
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to Chat Server');
            newSocket.emit('join', { username: user.username, name: user.name });
        });

        newSocket.on('chat_history', (history: Message[]) => {
            setMessages(history);
        });

        newSocket.on('receive_message', (message: Message) => {
            // Filter out optimistic message if it exists
            setMessages((prev) => {
                const filtered = prev.filter(m => !(m.isOptimistic && m.text === message.text && m.username === message.username));
                return [...filtered, message];
            });

            if (message.username !== user.username) {
                setUnreadCounts(prev => ({
                    ...prev,
                    'global': (prev['global'] || 0) + 1
                }));
            }
        });

        newSocket.on('receive_private_message', (message: any) => {
            const otherUser = message.from === user.username ? message.to : message.from;
            setPrivateMessages(prev => {
                const chat = prev[otherUser] || [];
                // Filter out optimistic
                const filtered = chat.filter(m => !(m.isOptimistic && m.text === message.text));
                return { ...prev, [otherUser]: [...filtered, message] };
            });

            if (message.from !== user.username) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [otherUser]: (prev[otherUser] || 0) + 1
                }));
            }
        });

        newSocket.on('user_typing', ({ username, room }: { username: string, room: string }) => {
            if (username === user.username) return;
            setTypers(prev => {
                const roomTypers = prev[room] || [];
                if (roomTypers.includes(username)) return prev;
                return { ...prev, [room]: [...roomTypers, username] };
            });
        });

        newSocket.on('user_stop_typing', ({ username, room }: { username: string, room: string }) => {
            setTypers(prev => {
                const roomTypers = prev[room] || [];
                return { ...prev, [room]: roomTypers.filter(u => u !== username) };
            });
        });

        newSocket.on('private_history', ({ withUser, messages }: { withUser: string, messages: Message[] }) => {
            setPrivateMessages(prev => ({ ...prev, [withUser]: messages }));
        });

        newSocket.on('users_update', (users: ConnectedUser[]) => {
            const uniqueUsers = Array.from(new Map(users.map(u => [u.username, u])).values());
            setOnlineUsers(uniqueUsers);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user.username, user.name]);

    const sendMessage = (text: string, replyTo?: Message | null) => {
        if (!socket) return;

        // Optimistic Update
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            text,
            username: user.username,
            name: user.name,
            timestamp: new Date().toISOString() as any,
            type: 'public',
            replyTo,
            isOptimistic: true
        };
        setMessages(prev => [...prev, optimisticMsg]);

        socket.emit('send_message', { text, username: user.username, name: user.name, replyTo });
    };

    const sendPrivateMessage = (to: string, text: string, replyTo?: Message | null) => {
        if (!socket) return;

        // Optimistic Update
        const optimisticMsg: any = {
            id: `temp-p-${Date.now()}`,
            text,
            from: user.username,
            to,
            name: user.name,
            timestamp: new Date().toISOString() as any,
            type: 'private',
            replyTo,
            isOptimistic: true
        };
        setPrivateMessages(prev => {
            const chat = prev[to] || [];
            return { ...prev, [to]: [...chat, optimisticMsg] };
        });

        socket.emit('send_private_message', {
            to,
            text,
            from: user.username,
            fromName: user.name,
            replyTo
        });
    };

    const emitTyping = (room: string) => {
        if (socket) {
            socket.emit('typing', { username: user.username, room });
        }
    };

    const emitStopTyping = (room: string) => {
        if (socket) {
            socket.emit('stop_typing', { username: user.username, room });
        }
    };

    const loadPrivateHistory = (withUser: string) => {
        if (socket) {
            socket.emit('get_private_history', { withUser, currentUser: user.username });
        }
    };

    const clearUnread = (chatId: string) => {
        setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
    };

    return {
        socket,
        messages,
        privateMessages,
        onlineUsers,
        unreadCounts,
        typers,
        sendMessage,
        sendPrivateMessage,
        emitTyping,
        emitStopTyping,
        loadPrivateHistory,
        clearUnread
    };
};
