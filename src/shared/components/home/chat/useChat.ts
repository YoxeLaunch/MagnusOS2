import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message, ConnectedUser } from './types';

export const useChat = (user: { username: string; name: string }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [privateMessages, setPrivateMessages] = useState<Record<string, Message[]>>({});
    const [onlineUsers, setOnlineUsers] = useState<ConnectedUser[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

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
            setMessages((prev) => [...prev, message]);
            setUnreadCounts(prev => ({
                ...prev,
                'global': (prev['global'] || 0) + 1
            }));
        });

        newSocket.on('receive_private_message', (message: any) => {
            const otherUser = message.from === user.username ? message.to : message.from;
            setPrivateMessages(prev => {
                const chat = prev[otherUser] || [];
                return { ...prev, [otherUser]: [...chat, message] };
            });

            if (message.from !== user.username) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [otherUser]: (prev[otherUser] || 0) + 1
                }));
            }
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
        const message = { text, username: user.username, name: user.name, replyTo };
        socket.emit('send_message', message);
    };

    const sendPrivateMessage = (to: string, text: string, replyTo?: Message | null) => {
        if (!socket) return;
        socket.emit('send_private_message', {
            to,
            text,
            from: user.username,
            fromName: user.name,
            replyTo
        });
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
        sendMessage,
        sendPrivateMessage,
        loadPrivateHistory,
        clearUnread
    };
};
