import { User } from '../../../types/user';

export interface Message {
    id: string;
    text: string;
    username: string;
    timestamp: string;
    type?: 'user' | 'system' | 'public' | 'private';
    from?: string;
    to?: string;
    name?: string;
    role?: string;
    tags?: string[];
    replyTo?: {
        id: string;
        text: string;
        username: string;
        name?: string;
    } | null;
}

export interface ConnectedUser {
    username: string;
    name: string;
    status: 'online' | 'offline';
    role: 'admin' | 'user';
    tags?: string[];
    avatar?: string;
    preferences?: any;
}

export interface ChatTheme {
    bg: string;
    text: string;
    accent: string;
    panel: string;
    primary: string;
}

export const THEMES: Record<string, ChatTheme> = {
    default: { bg: '', text: 'text-slate-900', accent: 'text-theme-gold', panel: '', primary: 'bg-theme-gold' },
    sakura: { bg: '/images/themes/sakura.png', text: 'text-pink-900', accent: 'text-pink-500', panel: 'bg-pink-50/90', primary: 'bg-pink-400' },
    gothic: { bg: '/images/themes/gothic.png', text: 'text-slate-200', accent: 'text-rose-600', panel: 'bg-zinc-900/90', primary: 'bg-rose-900' },
    luxury: { bg: '/images/themes/luxury.png', text: 'text-amber-100', accent: 'text-amber-400', panel: 'bg-slate-900/90', primary: 'bg-amber-500' },
    cyber: { bg: '/images/themes/cyber.png', text: 'text-cyan-100', accent: 'text-cyan-400', panel: 'bg-slate-900/90', primary: 'bg-cyan-600' },
    zen: { bg: '/images/themes/zen.png', text: 'text-emerald-900', accent: 'text-emerald-600', panel: 'bg-emerald-50/90', primary: 'bg-emerald-500' },
    ocean: { bg: '/images/themes/ocean.png', text: 'text-blue-100', accent: 'text-blue-400', panel: 'bg-slate-900/90', primary: 'bg-blue-600' },
};
