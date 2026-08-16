import React, { useEffect, useState } from 'react';
import { useDocker } from '../context/DockerContext';
import { CircularGauge } from './CircularGauge';
import { HardDrive } from 'lucide-react';

interface GlobalStats {
    cpu: { percent: number; cores: number; loadAverage: number[] };
    ram: { percent: number; usedGB: number; totalGB: number };
    disk: { percent: number; usedGB: number; freeGB: number; totalGB: number } | null;
    temperature: number | null;
    uptime: number;
}

export const SystemHUD: React.FC = () => {
    const { socket } = useDocker();
    const [stats, setStats] = useState<GlobalStats | null>(null);

    useEffect(() => {
        if (!socket) return;

        socket.emit('subscribe-system-stats');
        const handleStats = (data: GlobalStats) => setStats(data);
        socket.on('system-stats', handleStats);

        return () => {
            socket.emit('unsubscribe-system-stats');
            socket.off('system-stats', handleStats);
        };
    }, [socket]);

    const diskPercent = stats?.disk?.percent ?? 0;
    const diskLow = diskPercent >= 85;

    return (
        <div className="rounded-2xl border border-slate-800 bg-[#0a0f1c]/80 backdrop-blur-sm p-5 flex flex-col lg:flex-row items-center gap-6">
            {/* Gauges circulares */}
            <div className="flex items-center gap-6 flex-wrap justify-center">
                <CircularGauge
                    value={stats?.cpu.percent ?? 0}
                    label="CPU"
                    displayValue={stats ? `${stats.cpu.percent.toFixed(0)}%` : '--'}
                    colorClass="text-cyan-400"
                    glowClass="drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]"
                />
                <CircularGauge
                    value={stats?.ram.percent ?? 0}
                    label="RAM"
                    displayValue={stats ? `${stats.ram.percent.toFixed(0)}%` : '--'}
                    colorClass="text-purple-400"
                    glowClass="drop-shadow-[0_0_8px_rgba(168,85,247,0.35)]"
                />
                <CircularGauge
                    value={stats?.temperature != null ? Math.min(100, (stats.temperature / 90) * 100) : 0}
                    label="TEMP"
                    displayValue={stats?.temperature != null ? `${stats.temperature.toFixed(0)}°` : 'N/A'}
                    colorClass={stats?.temperature != null && stats.temperature >= 75 ? 'text-red-400' : 'text-amber-400'}
                    glowClass="drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]"
                />
            </div>

            <div className="hidden lg:block w-px h-16 bg-slate-800" />

            {/* Barra de disco */}
            <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-slate-300">
                        <HardDrive size={16} className={diskLow ? 'text-red-400' : 'text-cyan-400'} />
                        <span className="text-xs font-semibold uppercase tracking-[0.15em]">Almacenamiento</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                        {stats?.disk
                            ? `${stats.disk.usedGB.toFixed(0)} GB / ${stats.disk.totalGB.toFixed(0)} GB`
                            : '-- / --'}
                    </span>
                </div>
                <div className="relative h-3 w-full rounded-full bg-slate-800/80 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${
                            diskLow
                                ? 'bg-gradient-to-r from-red-500 to-orange-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                        }`}
                        style={{ width: `${diskPercent}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-500">
                        {stats?.disk ? `${stats.disk.freeGB.toFixed(0)} GB libres` : ''}
                    </span>
                    <span className={`text-[10px] font-semibold ${diskLow ? 'text-red-400' : 'text-slate-500'}`}>
                        {diskPercent.toFixed(1)}% usado
                    </span>
                </div>
            </div>
        </div>
    );
};
