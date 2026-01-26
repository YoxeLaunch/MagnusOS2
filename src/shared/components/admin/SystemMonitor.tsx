import React, { useEffect, useState } from 'react';
import { Activity, Database, Server, Clock, Cpu, HardDrive } from 'lucide-react';

interface SystemStats {
    uptime: number;
    dbSize: string;
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
    };
    loadAverage: number[];
    cpus: number;
    platform: string;
}

export const SystemMonitor: React.FC = () => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const response = await fetch(`/api/system/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching system stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Update every 5s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando métricas...</div>;
    if (!stats) return <div className="p-8 text-center text-red-400">Error conectando con el servidor</div>;

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const formatBytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(0) + ' MB';

    return (
        <div className="space-y-6 animate-fade-in p-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="text-blue-500 dark:text-blue-400" />
                Estado del Servidor
            </h3>

            {/* Main Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* Uptime */}
                <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400 text-sm">
                        <Clock size={16} />
                        UPTIME
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                        {formatUptime(stats.uptime)}
                    </div>
                </div>

                {/* DB Size */}
                <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400 text-sm">
                        <Database size={16} />
                        DB SIZE
                    </div>
                    <div className="text-2xl font-bold text-theme-gold font-mono">
                        {stats.dbSize} MB
                    </div>
                </div>

                {/* Platform */}
                <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400 text-sm">
                        <Server size={16} />
                        OS
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white uppercase truncate">
                        {stats.platform}
                    </div>
                </div>

                {/* CPUs */}
                <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400 text-sm">
                        <Cpu size={16} />
                        CORES
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                        {stats.cpus}
                    </div>
                </div>
            </div>

            {/* Resources Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* RAM Usage */}
                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-2">
                            <HardDrive size={18} className="text-purple-500 dark:text-purple-400" /> Memoria RAM
                        </h4>
                        <span className="text-xs font-mono text-purple-600 dark:text-purple-300 bg-purple-500/10 px-2 py-1 rounded">
                            {formatBytes(stats.system.usedMemory)} / {formatBytes(stats.system.totalMemory)}
                        </span>
                    </div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-1000 ease-in-out"
                            style={{ width: `${stats.system.memoryUsagePercentage}%` }}
                        />
                    </div>
                    <div className="mt-2 text-right text-xs text-slate-500">
                        {stats.system.memoryUsagePercentage}% Usado
                    </div>
                </div>

                {/* Node Process Memory */}
                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-2">
                            <Activity size={18} className="text-green-500 dark:text-green-400" /> Node Process
                        </h4>
                        <span className="text-xs font-mono text-green-600 dark:text-green-300 bg-green-500/10 px-2 py-1 rounded">
                            RSS: {formatBytes(stats.process.rss)}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-lg border border-slate-100 dark:border-transparent">
                            <div className="text-slate-500 text-xs mb-1">Heap Total</div>
                            <div className="text-slate-900 dark:text-white font-mono">{formatBytes(stats.process.heapTotal)}</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-lg border border-slate-100 dark:border-transparent">
                            <div className="text-slate-500 text-xs mb-1">Heap Used</div>
                            <div className="text-slate-900 dark:text-white font-mono">{formatBytes(stats.process.heapUsed)}</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
