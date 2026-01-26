import { Workflow, Shield, Box, LayoutDashboard, Terminal, ExternalLink, Server, BookOpen } from 'lucide-react';

interface ServiceLink {
    name: string;
    port: number;
    path?: string;
    protocol: 'http' | 'https';
    icon: React.ElementType;
    color: string;
    description: string;
}

const SERVICES: ServiceLink[] = [
    {
        name: 'n8n',
        port: 5678,
        protocol: 'http',
        icon: Workflow,
        color: 'text-red-500',
        description: 'Automatización'
    },
    {
        name: 'Pi-hole',
        port: 443,
        path: '/admin',
        protocol: 'https',
        icon: Shield,
        color: 'text-green-500',
        description: 'DNS/Bloqueo'
    },
    {
        name: 'Portainer',
        port: 9443,
        protocol: 'https',
        icon: Box,
        color: 'text-blue-500',
        description: 'Contenedores'
    },
    {
        name: 'Homarr',
        port: 7575,
        protocol: 'http',
        icon: LayoutDashboard,
        color: 'text-purple-500',
        description: 'Dashboard'
    },
    {
        name: 'Dockge',
        port: 5001,
        protocol: 'http',
        icon: Terminal,
        color: 'text-orange-500',
        description: 'Docker Stacks'
    },
    {
        name: 'Wikipedia',
        port: 8080,
        protocol: 'http',
        icon: BookOpen,
        color: 'text-gray-600',
        description: 'Offline (Kiwix)'
    },
];

export const ServerServices = () => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

    const getServiceUrl = (service: ServiceLink) => {
        const base = `${service.protocol}://${hostname}:${service.port}`;
        return service.path ? `${base}${service.path}` : base;
    };

    return (
        <div className="w-full mt-8 animate-fade-in">
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-4">
                <Server size={16} className="text-slate-500 dark:text-slate-400" />
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                    Servicios del Servidor
                </h3>
            </div>

            {/* Services Grid */}
            <div className="flex flex-wrap gap-3 justify-center">
                {SERVICES.map((service) => {
                    const Icon = service.icon;
                    return (
                        <a
                            key={service.name}
                            href={getServiceUrl(service)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full hover:bg-white dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 hover:scale-105"
                        >
                            <Icon size={14} className={`${service.color} group-hover:scale-110 transition-transform`} />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {service.name}
                            </span>
                            <ExternalLink size={10} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    );
                })}
            </div>
        </div>
    );
};
