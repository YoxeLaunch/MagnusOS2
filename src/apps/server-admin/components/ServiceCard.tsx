import React, { useEffect, useRef, useState } from 'react';
import { useDocker } from '../context/DockerContext';
import { ExternalLink, Terminal, Cpu, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';
import { NetworkSparkline } from './NetworkSparkline';
import { resolveServiceMeta, resolveServiceUrl } from '../config/services';

interface Props {
    container: any;
    onOpenTerminal: () => void;
    url?: string;
}

const MAX_SAMPLES = 60; // ~2min a 2s por muestra

export const ServiceCard: React.FC<Props> = ({ container, onOpenTerminal, url }) => {
    const { socket } = useDocker();
    const [stats, setStats] = useState<any>(null);
    const [netHistory, setNetHistory] = useState<number[]>([]);
    const lastNetTotal = useRef<number | null>(null);

    useEffect(() => {
        if (!socket) return;

        socket.emit('subscribe-stats', container.Id);

        const handleStats = (data: any) => {
            if (data.id !== container.Id) return;
            setStats(data.stats);

            if (data.stats?.netIO) {
                const total = Object.values(data.stats.netIO as Record<string, any>).reduce(
                    (sum: number, iface: any) => sum + (iface.rx_bytes || 0) + (iface.tx_bytes || 0),
                    0
                );
                if (lastNetTotal.current !== null) {
                    const delta = Math.max(0, total - lastNetTotal.current);
                    setNetHistory((prev) => [...prev.slice(-(MAX_SAMPLES - 1)), delta]);
                }
                lastNetTotal.current = total;
            }
        };

        socket.on('container-stats', handleStats);

        return () => {
            socket.emit('unsubscribe-stats');
            socket.off('container-stats', handleStats);
        };
    }, [socket, container.Id]);

    const isRunning = container.State === 'running';
    const containerName = container.Names[0].replace('/', '');
    const meta = resolveServiceMeta(containerName);
    const Icon = meta.icon;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const resolvedUrl = url && url !== '#' ? url : resolveServiceUrl(meta, hostname);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative overflow-hidden rounded-xl border p-6
                ${isRunning ? 'border-slate-700 bg-slate-900/50' : 'border-red-900/30 bg-red-900/10'}
                backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]
            `}
        >
            {/* Sparkline de red de fondo */}
            <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none opacity-60">
                <NetworkSparkline data={netHistory} colorClass={isRunning ? 'text-cyan-500' : 'text-red-500'} height={48} />
            </div>

            <div className="relative flex justify-between items-start mb-4">
                <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                        isRunning
                            ? 'bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.7)] animate-pulse'
                            : 'bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.7)] animate-pulse'
                    }`} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Icon size={14} className={meta.color} />
                            <h3 className="text-lg font-bold text-slate-100 truncate max-w-[180px]">
                                {meta.label !== containerName ? meta.label : containerName}
                            </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {stats ? `${stats.memory} MB en uso` : meta.description}
                        </p>
                    </div>
                </div>
                {resolvedUrl !== '#' && (
                    <a
                        href={resolvedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors shrink-0"
                    >
                        <ExternalLink size={18} />
                    </a>
                )}
            </div>

            {/* Stats Grid */}
            <div className="relative grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#0a0f1c] rounded-lg p-3 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Cpu size={14} />
                        <span className="text-xs">CPU</span>
                    </div>
                    <div className="text-lg font-mono text-blue-400">
                        {stats ? `${stats.cpu}%` : '--'}
                    </div>
                </div>
                <div className="bg-[#0a0f1c] rounded-lg p-3 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors" />
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <HardDrive size={14} />
                        <span className="text-xs">RAM</span>
                    </div>
                    <div className="text-lg font-mono text-purple-400">
                        {stats ? `${stats.memory}MB` : '--'}
                    </div>
                </div>
            </div>

            <button
                onClick={onOpenTerminal}
                className="relative w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-cyan-600 hover:text-white transition-all font-medium text-sm border border-slate-700 hover:border-cyan-500"
            >
                <Terminal size={16} />
                Open Terminal
            </button>
        </motion.div>
    );
};
