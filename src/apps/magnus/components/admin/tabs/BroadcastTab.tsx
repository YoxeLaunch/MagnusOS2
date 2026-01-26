import React, { useState } from 'react';
import { Radio as LucideRadio, Send as LucideSend, AlertTriangle, Info, Bell, MessageSquare } from 'lucide-react';
import { useToast } from '../../../../../shared/context/ToastContext';

export const BroadcastTab: React.FC = () => {
    const toast = useToast();
    const [broadcastMsg, setBroadcastMsg] = useState({ title: '', message: '', type: 'info' as 'info' | 'warning' | 'alert' });
    const [isSending, setIsSending] = useState(false);

    const sendBroadcast = async () => {
        if (!broadcastMsg.title) return toast.warning("El título es obligatorio");
        if (!broadcastMsg.message) return toast.warning("El mensaje no puede estar vacío");

        setIsSending(true);

        try {
            const res = await fetch(`/api/system/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(broadcastMsg)
            });

            if (res.ok) {
                toast.success("Mensaje enviado a toda la red.");
                setBroadcastMsg({ title: '', message: '', type: 'info' });
            } else {
                const errData = await res.json();
                throw new Error(errData.error || `Server Error: ${res.status}`);
            }

        } catch (e: any) {
            console.error(e);
            toast.error(`Error enviando broadcast: ${e.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'info': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'warning': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'alert': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-slate-500 bg-slate-500/10';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'info': return <Info size={18} />;
            case 'warning': return <AlertTriangle size={18} />;
            case 'alert': return <Bell size={18} />;
            default: return <MessageSquare size={18} />;
        }
    };

    return (
        <div className="flex flex-col items-center p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
                            <LucideRadio size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Transmisión Global</h3>
                            <p className="text-sm text-slate-500">Enviar notificación a todos los usuarios activos</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Aviso</label>
                        <div className="grid grid-cols-3 gap-4">
                            {['info', 'warning', 'alert'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setBroadcastMsg({ ...broadcastMsg, type: type as any })}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold capitalize transition-all duration-200 ${broadcastMsg.type === type
                                        ? getTypeColor(type) + ' ring-2 ring-offset-2 ring-transparent dark:ring-offset-slate-900'
                                        : 'border-slate-100 dark:border-white/5 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {getTypeIcon(type)}
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título</label>
                            <input
                                type="text"
                                value={broadcastMsg.title}
                                onChange={e => setBroadcastMsg({ ...broadcastMsg, title: e.target.value })}
                                placeholder="Ej: Mantenimiento Programado"
                                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:font-normal"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mensaje</label>
                            <textarea
                                value={broadcastMsg.message}
                                onChange={e => setBroadcastMsg({ ...broadcastMsg, message: e.target.value })}
                                placeholder="Escribe el mensaje que verán todos los usuarios..."
                                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-32 resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={sendBroadcast}
                            disabled={isSending || !broadcastMsg.title || !broadcastMsg.message}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isSending ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <LucideSend size={20} />
                            )}
                            {isSending ? 'Enviando...' : 'Enviar Mensaje'}
                        </button>
                        <p className="mt-4 text-[10px] uppercase font-bold text-center text-slate-400 tracking-wider">
                            Este mensaje aparecerá instantáneamente en todas las pantallas
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
