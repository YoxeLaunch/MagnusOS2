import React, { useEffect, useState } from 'react';
import { useDocker } from '../context/DockerContext';
import { ServiceCard } from '../components/ServiceCard';
import { TerminalView } from '../components/TerminalView';
import { Activity, Server, Box, Terminal } from 'lucide-react';

interface Container {
    Id: string;
    Names: string[];
    Image: string;
    State: string;
    Status: string;
}

export const Dashboard: React.FC = () => {
    const { socket, isConnected } = useDocker();
    const [containers, setContainers] = useState<Container[]>([]);
    const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);

    useEffect(() => {
        if (!socket) return;

        socket.emit('list-containers');

        socket.on('containers-list', (data: Container[]) => {
            setContainers(data);
        });

        const interval = setInterval(() => {
            socket.emit('list-containers');
        }, 5000);

        return () => {
            socket.off('containers-list');
            clearInterval(interval);
        };
    }, [socket]);

    const getServiceIcon = (name: string) => {
        if (name.includes('minecraft')) return '/minecraft-icon.png'; // Placeholder or generic
        if (name.includes('pihole')) return '🛡️';
        if (name.includes('n8n')) return '⚡';
        return '📦';
    };

    const getServiceUrl = (container: Container) => {
        const name = container.Names[0];
        // Hardcoded mapping based on docker-compose ports
        if (name.includes('portainer')) return 'https://localhost:9443';
        if (name.includes('n8n')) return 'http://localhost:5678';
        if (name.includes('magnus')) return 'http://localhost:3000';
        if (name.includes('homarr')) return 'http://localhost:7575';
        if (name.includes('dockge')) return 'http://localhost:5001';
        return '#';
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
                        Magnus Server HUD
                    </h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2">
                        <Activity className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                        System Status: {isConnected ? 'Online' : 'Reconnecting...'}
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {containers.map(container => (
                    <ServiceCard
                        key={container.Id}
                        container={container}
                        onOpenTerminal={() => setSelectedContainer(container)}
                        url={getServiceUrl(container)}
                    />
                ))}
            </div>

            {selectedContainer && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1f2e] w-full max-w-5xl h-[80vh] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-4 bg-[#0f1219] border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-mono text-cyan-400 flex items-center gap-2">
                                <Terminal className="w-5 h-5" />
                                {selectedContainer.Names[0]}
                            </h3>
                            <button
                                onClick={() => setSelectedContainer(null)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex-1 relative">
                            <TerminalView containerId={selectedContainer.Id} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
