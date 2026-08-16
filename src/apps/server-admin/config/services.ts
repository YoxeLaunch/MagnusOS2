import { Workflow, Shield, Box, LayoutDashboard, Terminal, Server, BookOpen, type LucideIcon } from 'lucide-react';

export interface ServiceMeta {
    match: string; // substring a buscar en el nombre del contenedor
    label: string;
    icon: LucideIcon;
    color: string; // clase de texto (tailwind) usada para icono/glow
    description: string;
    url?: string; // si no depende del hostname dinámico
    port?: number;
    path?: string;
    protocol?: 'http' | 'https';
}

export const SERVICE_REGISTRY: ServiceMeta[] = [
    { match: 'n8n', label: 'n8n', icon: Workflow, color: 'text-red-400', description: 'Automatización', port: 5678, protocol: 'http' },
    { match: 'pihole', label: 'Pi-hole', icon: Shield, color: 'text-green-400', description: 'DNS / Bloqueo', port: 443, path: '/admin', protocol: 'https' },
    { match: 'portainer', label: 'Portainer', icon: Box, color: 'text-blue-400', description: 'Contenedores', port: 9443, protocol: 'https' },
    { match: 'homarr', label: 'Homarr', icon: LayoutDashboard, color: 'text-purple-400', description: 'Dashboard', port: 7575, protocol: 'http' },
    { match: 'dockge', label: 'Dockge', icon: Terminal, color: 'text-orange-400', description: 'Docker Stacks', port: 5001, protocol: 'http' },
    { match: 'kiwix', label: 'Wikipedia Offline', icon: BookOpen, color: 'text-slate-300', description: 'Kiwix', port: 8080, protocol: 'http' },
    { match: 'magnus', label: 'Magnus OS', icon: Server, color: 'text-cyan-400', description: 'Plataforma principal', port: 4000, protocol: 'http' },
];

export const resolveServiceMeta = (containerName: string): ServiceMeta => {
    const name = containerName.toLowerCase();
    const found = SERVICE_REGISTRY.find((s) => name.includes(s.match));
    if (found) return found;
    return {
        match: name,
        label: containerName,
        icon: Box,
        color: 'text-slate-400',
        description: 'Servicio',
    };
};

export const resolveServiceUrl = (meta: ServiceMeta, hostname: string): string => {
    if (meta.url) return meta.url;
    if (!meta.port) return '#';
    const base = `${meta.protocol ?? 'http'}://${hostname}:${meta.port}`;
    return meta.path ? `${base}${meta.path}` : base;
};
