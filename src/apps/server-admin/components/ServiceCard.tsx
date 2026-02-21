import React, { useEffect, useState } from 'react';
import { useDocker } from '../context/DockerContext';
import { ExternalLink, Terminal, Cpu, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    container: any;
    onOpenTerminal: () => void;
    url: string;
}

export const ServiceCard: React.FC<Props> = ({ container, onOpenTerminal, url }) => {
    const { socket } = useDocker();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (!socket) return;

        socket.emit('subscribe-stats', container.Id);

        const handleStats = (data: any) => {
            if (data.id === container.Id) {
                setStats(data.stats);
            }
        };

        socket.on('container-stats', handleStats);

        return () => {
            socket.emit('unsubscribe-stats');
            socket.off('container-stats', handleStats);
        };
    }, [socket, container.Id]);

    const isRunning = container.State === 'running';

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
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-100 truncate max-w-[200px]">
                        {container.Names[0].replace('/', '')}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${isRunning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {container.Status}
                    </span>
                </div>
                {url !== '#' && (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                    >
                        <ExternalLink size={18} />
                    </a>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
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
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-cyan-600 hover:text-white transition-all font-medium text-sm border border-slate-700 hover:border-cyan-500"
            >
                <Terminal size={16} />
                Open Terminal
            </button>
        </motion.div>
    );
};
