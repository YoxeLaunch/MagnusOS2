import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Cpu, Server, Clock } from 'lucide-react';

interface SystemStats {
    uptime: number;
    system: {
        totalMemory: number;
        freeMemory: number;
        usedMemory: number;
        memoryUsagePercentage: string;
    };
    process: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
    };
    loadAverage: number[];
    cpus: number;
    platform: string;
    release: string;
}

export const SystemMonitor: React.FC = () => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [history, setHistory] = useState<{ time: string, heap: number, rss: number }[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`/api/system/stats`);
                if (!res.ok) return;
                const data: SystemStats = await res.json();

                setStats(data);

                setHistory(prev => {
                    const now = new Date();
                    const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
                    const newEntry = {
                        time: timeStr,
                        heap: parseFloat((data.process.heapUsed / 1024 / 1024).toFixed(2)),
                        rss: parseFloat((data.process.rss / 1024 / 1024).toFixed(2))
                    };
                    const newHistory = [...prev, newEntry];
                    if (newHistory.length > 20) newHistory.shift(); // Keep last 20 points
                    return newHistory;
                });

            } catch (error) {
                console.error("Failed to fetch system stats", error);
            }
        };

        const interval = setInterval(fetchStats, 2000);
        fetchStats(); // Initial call

        return () => clearInterval(interval);
    }, []);

    if (!stats) return <div className="p-4 text-center text-slate-500">Cargando métricas del sistema...</div>;

    const formatBytes = (bytes: number) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
        return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        const s = Math.floor(seconds % 60);
        return `${d}d ${h}h ${m}m ${s}s`;
    };

    return (
        <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Uso de Memoria</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.system.memoryUsagePercentage}%</p>
                    <p className="text-xs text-slate-400">Total: {formatBytes(stats.system.totalMemory)}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-4 h-4 text-purple-500" />
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Carga CPU</h4>
                    </div>
                    {/* Windows loadavg is always 0 on some node versions, but showing logic anyway */}
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {stats.loadAverage[0] > 0 ? stats.loadAverage[0].toFixed(2) : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-400">{stats.cpus} Núcleos Detectados</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-green-500" />
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Proceso Node</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatBytes(stats.process.heapUsed)}</p>
                    <p className="text-xs text-slate-400">Heap Total: {formatBytes(stats.process.heapTotal)}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Tiempo Activo</h4>
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white break-words leading-tight">{formatUptime(stats.uptime)}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col min-h-[300px]">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm">Consumo de Memoria en Tiempo Real (MB)</h3>
                <div className="flex-1 w-full h-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                            <defs>
                                <linearGradient id="colorHeap" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Area type="monotone" dataKey="heap" stroke="#10b981" fillOpacity={1} fill="url(#colorHeap)" strokeWidth={2} name="Heap Used" />
                            <Line type="monotone" dataKey="rss" stroke="#3b82f6" strokeWidth={2} dot={false} name="RSS" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 font-mono">
                Plataforma: {stats.platform} {stats.release}
            </div>
        </div>
    );
};
