import React, { useEffect, useState } from 'react';
import { io } from "socket.io-client";
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, AlertTriangle, ShieldAlert, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Hook up to existing socket if possible, or new connection?
// The app uses a shared ChatContext usually, but here we might want a raw hook or reuse context.
// For simplicity and robustness, we'll assume we can access the socket from window or duplicate connection for now (not ideal but safe)
// OR better: use the one from ChatContext if exposed. MasterLayout has access to it?
// MasterLayout does not seem to have direct access to socket instance from props.
// Let's use a standalone socket connection for "System" channel or import logic.

// Actually, `useChat` likely exposes socket? Let's check ChatContext later. 
// For now, I'll instantiate a listener here. Connection management is handled by socket.io intelligently usually.

interface BroadcastMessage {
    id: string;
    type: 'info' | 'warning' | 'alert' | 'success';
    title: string;
    message: string;
    timestamp: Date;
}

export const BroadcastManager: React.FC = () => {
    const [notifications, setNotifications] = useState<BroadcastMessage[]>([]);
    const { user } = useAuth(); // Only if we want to filter by user later

    useEffect(() => {
        console.log("Inicializando BroadcastManager...", `Using relative path`);
        const socket = io();

        socket.on('connect', () => {
            console.log("BroadcastManager: Socket Conectado!", socket.id);
        });

        socket.on('connect_error', (err) => {
            console.error("BroadcastManager: Error de conexión", err);
        });

        socket.on('system:broadcast', (data: any) => {
            console.log("BroadcastManager: MENSAJE RECIBIDO!", data);
            const newMsg: BroadcastMessage = {
                id: Date.now().toString(),
                type: data.type || 'info',
                title: data.title || 'Sistema Magnus',
                message: data.message,
                timestamp: new Date()
            };

            setNotifications(prev => [...prev, newMsg]);

            // Auto dismiss info/warnings after 10s
            if (data.type !== 'alert') {
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== newMsg.id));
                }, 10000);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
            <AnimatePresence>
                {notifications.map(notif => (
                    <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex gap-4 relative overflow-hidden
                            ${notif.type === 'alert' ? 'bg-red-500/90 text-white border-red-400' : ''}
                            ${notif.type === 'warning' ? 'bg-yellow-500/90 text-black border-yellow-400' : ''}
                            ${notif.type === 'info' ? 'bg-slate-900/90 text-white border-white/20' : ''}
                            ${notif.type === 'success' ? 'bg-emerald-600/90 text-white border-emerald-400 shadow-emerald-500/20' : ''}
                        `}
                    >
                        <div className="shrink-0">
                            {notif.type === 'alert' && <ShieldAlert size={24} className="animate-pulse" />}
                            {notif.type === 'warning' && <AlertTriangle size={24} />}
                            {notif.type === 'info' && <Bell size={24} className="text-theme-gold" />}
                            {notif.type === 'success' && <CheckCircle size={24} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm uppercase tracking-wider mb-1">{notif.title}</h4>
                            <p className="text-sm opacity-90 leading-relaxed font-medium">{notif.message}</p>
                            <span className="text-[10px] opacity-60 mt-2 block font-mono">
                                {new Date(notif.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <button
                            onClick={() => removeNotification(notif.id)}
                            className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
