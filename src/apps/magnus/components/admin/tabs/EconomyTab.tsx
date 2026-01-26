import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, Save, DollarSign, Euro } from 'lucide-react';
import { useToast } from '../../../../../shared/context/ToastContext';
import { User } from '../../../types';

interface EconomyTabProps {
    currentUser: User;
    isSoberano: boolean;
}

export const EconomyTab: React.FC<EconomyTabProps> = ({ currentUser, isSoberano }) => {
    const toast = useToast();
    const [rates, setRates] = useState({ usd: 0, eur: 0 });
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingRates, setLoadingRates] = useState(false);

    useEffect(() => {
        loadRates();
        loadLogs();
    }, []);

    const loadRates = async () => {
        try {
            const res = await fetch(`/api/rates`);
            const data = await res.json();
            setRates(data);
        } catch (e) {
            console.error("Failed to load rates", e);
        }
    };

    const loadLogs = async () => {
        try {
            const res = await fetch(`/api/rates/history`);
            const data = await res.json();
            setLogs(data);
        } catch (e) {
            console.error("Failed to load logs", e);
        }
    };

    const updateRates = async () => {
        if (!isSoberano) {
            toast.warning('Acceso Denegado: Solo el Soberano puede alterar la economía.');
            return;
        }

        setLoadingRates(true);
        try {
            const res = await fetch(`/api/rates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...rates,
                    username: currentUser.username
                })
            });

            if (!res.ok) throw new Error('Unauthorized');

            toast.success('Tasas actualizadas correctamente');
            loadLogs();
        } catch (e) {
            console.error("Failed to update rates", e);
            toast.error('Error al actualizar tasas: Acceso Denegado');
        } finally {
            setLoadingRates(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full p-6 max-w-6xl mx-auto">
            {/* Left: Vault Control */}
            <div className="w-full md:w-1/3">
                <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg ${!isSoberano ? 'opacity-90' : ''}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-theme-gold/10 rounded-xl text-theme-gold shadow-sm">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Bóveda Central</h3>
                            <p className="text-xs text-slate-500">Control Económico Global</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex justify-between tracking-wider">
                                Tasa USD (Venta)
                                <span className="text-green-500 font-mono">DOP</span>
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-theme-gold transition-colors">
                                    <DollarSign size={18} />
                                </span>
                                <input
                                    type="number"
                                    value={rates.usd}
                                    onChange={e => setRates({ ...rates, usd: parseFloat(e.target.value) })}
                                    disabled={!isSoberano}
                                    className="w-full pl-10 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono font-bold text-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-theme-gold/50 focus:border-theme-gold outline-none disabled:cursor-not-allowed transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex justify-between tracking-wider">
                                Tasa EUR (Venta)
                                <span className="text-blue-500 font-mono">DOP</span>
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-theme-gold transition-colors">
                                    <Euro size={18} />
                                </span>
                                <input
                                    type="number"
                                    value={rates.eur}
                                    onChange={e => setRates({ ...rates, eur: parseFloat(e.target.value) })}
                                    disabled={!isSoberano}
                                    className="w-full pl-10 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono font-bold text-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-theme-gold/50 focus:border-theme-gold outline-none disabled:cursor-not-allowed transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={updateRates}
                            disabled={loadingRates || !isSoberano}
                            className="w-full py-4 bg-theme-gold hover:bg-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-theme-gold/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {loadingRates ? 'Procesando...' : !isSoberano ? (
                                <><Shield size={18} /> Solo Soberano</>
                            ) : (
                                <>
                                    <Save size={18} /> Aplicar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Market History */}
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                        <TrendingUp className="text-purple-500" />
                        Historial de Mercado
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                    {logs.map((log) => (
                        <div key={log.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 hover:border-theme-gold/30 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${log.code === 'USD'
                                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                                    : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30'
                                    }`}>
                                    {log.code === 'USD' ? '$' : '€'}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white text-sm">{log.code} Actualizado</div>
                                    <div className="text-xs text-slate-500">{new Date(log.date).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="font-mono font-bold text-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-black/20 px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10">
                                {log.rate.toFixed(2)}
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                            <TrendingUp size={32} />
                            <p>No hay registros de cambios</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
