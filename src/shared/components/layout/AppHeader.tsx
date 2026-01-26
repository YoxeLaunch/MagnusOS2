import React, { useState } from 'react';
import { Shield, Settings, LogOut, Menu, X, MessageSquare, Home, ArrowLeft, Wallet, Brain, Crown, ShieldCheck } from 'lucide-react';
import { User } from '../../types/user';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface AppHeaderProps {
    user: User | null;
    title?: string;
    subtitle?: string;
    isAdmin: boolean;
    onOpenAdmin: () => void;
    onOpenSettings: () => void;
    onOpenChat: () => void;
    onLogout: () => void;

    currentApp: 'magnus' | 'finanza' | 'auditor';
    navItems?: { label: string; icon: any; onClick: () => void; isActive?: boolean }[];
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    user, title, subtitle, isAdmin, onOpenAdmin, onOpenSettings, onOpenChat, onLogout, currentApp, navItems
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Common Button Component for consistency
    const ActionButton = ({ onClick, icon: Icon, label, className = "", danger = false }: any) => (
        <button
            onClick={onClick}
            className={`p-2.5 rounded-full transition-all backdrop-blur-sm shadow-sm flex items-center gap-3 ${danger
                ? "bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white"
                : "bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
                } ${className}`}
            title={label}
        >
            <Icon size={18} />
            {/* Show label only in mobile menu list context */}
            <span className="md:hidden font-bold text-sm">{label}</span>
        </button>
    );

    const switchAppTarget = currentApp === 'magnus' ? '/finanza' : '/magnus';
    const SwitchIcon = currentApp === 'magnus' ? Wallet : Brain;
    const switchLabel = currentApp === 'magnus' ? 'Ir a Finanzas' : 'Ir a Mentoría';

    return (
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between p-4 md:p-6 pb-2 md:pb-6 relative z-30">
            {/* Left: Title / Back (Mobile mainly, or if needed) */}
            <div className="flex items-center gap-4">
                {/* Hidden on desktop usually if Sidebar handles nav, but good for mobile */}
                <div className="md:hidden">
                    {/* Placeholder for potential sidebar toggle if we ever connect it, currently generic */}
                </div>

                {title && (
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white leading-none">
                            {title}
                        </h1>
                        {subtitle && <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 tracking-wider uppercase">{subtitle}</p>}
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">

                {/* --- DESKTOP VIEW (MD+) --- */}
                <div className="hidden md:flex items-center gap-3">
                    <span className="text-xs text-right mr-2 hidden lg:block">
                        <span className="block text-slate-500 dark:text-slate-400 uppercase tracking-wider scale-90">Cuenta Activa</span>
                        <div className="flex items-center justify-end gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">{user?.name}</span>
                            {(user?.username === 'soberano' || user?.role === 'admin' || user?.tags?.includes('VIP')) && (
                                <span title="Miembro VIP">
                                    <Crown size={14} className="text-theme-gold fill-theme-gold/20" />
                                </span>
                            )}
                        </div>
                    </span>

                    {isAdmin && (
                        <button
                            onClick={onOpenAdmin}
                            className="px-3 py-1.5 rounded-full bg-theme-gold/10 hover:bg-theme-gold text-theme-gold hover:text-black transition-all backdrop-blur-sm shadow-sm border border-theme-gold/30 flex items-center gap-2"
                            title="Panel Soberano"
                        >
                            <Shield size={16} />
                            <span className="text-xs font-bold tracking-wider uppercase">Soberano</span>
                        </button>
                    )}

                    <ActionButton onClick={onOpenChat} icon={MessageSquare} label="Chat" />
                    <ActionButton onClick={onOpenSettings} icon={Settings} label="Configuración" />

                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>

                    <button
                        onClick={onLogout}
                        className="p-2.5 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all duration-300 group"
                        title="Cerrar Sesión"
                    >
                        <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* --- MOBILE VIEW (Hamburger) --- */}
                <div className="md:hidden relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
                                className="absolute top-14 right-0 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-2 origin-top-right z-50"
                            >
                                <div className="pb-4 border-b border-slate-100 dark:border-white/5 mb-2">
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hola,</span>
                                    <span className="font-bold text-lg text-slate-900 dark:text-white truncate block">{user?.name}</span>
                                </div>

                                {/* Main App Navigation (Mobile Only) */}
                                {navItems && navItems.length > 0 && (
                                    <div className="mb-2 space-y-1">
                                        {navItems.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { item.onClick(); setIsMenuOpen(false); }}
                                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-sm font-bold ${item.isActive
                                                    ? "bg-theme-gold/10 text-theme-gold"
                                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                                                    }`}
                                            >
                                                <item.icon size={18} />
                                                {item.label}
                                            </button>
                                        ))}
                                        <div className="h-px bg-slate-100 dark:bg-white/5 my-2"></div>
                                    </div>
                                )}

                                {/* Navigation Quick Links (Mobile Only) */}
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <Link to="/" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-blue-600 border border-slate-200 dark:border-white/5 transition-colors">
                                        <Home size={20} />
                                        <span className="text-[10px] mt-1 font-bold">Inicio</span>
                                    </Link>
                                    <Link to={currentApp === 'auditor' ? '/magnus' : '/auditor'} className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-emerald-500 border border-slate-200 dark:border-white/5 transition-colors">
                                        <ShieldCheck size={20} />
                                        <span className="text-[10px] mt-1 font-bold">Auditoría</span>
                                    </Link>
                                    <Link to={switchAppTarget} className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-theme-gold border border-slate-200 dark:border-white/5 transition-colors">
                                        <SwitchIcon size={20} />
                                        <span className="text-[10px] mt-1 font-bold">Cambiar</span>
                                    </Link>
                                </div>

                                {isAdmin && (
                                    <ActionButton
                                        onClick={() => { onOpenAdmin(); setIsMenuOpen(false); }}
                                        icon={Shield}
                                        label="Panel Soberano"
                                        className="w-full text-left !justify-start hover:text-theme-gold !bg-theme-gold/5 border border-theme-gold/10"
                                    />
                                )}

                                <ActionButton
                                    onClick={() => { onOpenChat(); setIsMenuOpen(false); }}
                                    icon={MessageSquare}
                                    label="Chat Global"
                                    className="w-full text-left !justify-start"
                                />

                                <ActionButton
                                    onClick={() => { onOpenSettings(); setIsMenuOpen(false); }}
                                    icon={Settings}
                                    label="Configuración"
                                    className="w-full text-left !justify-start"
                                />

                                <div className="h-px bg-slate-100 dark:bg-white/5 my-1"></div>

                                <ActionButton
                                    onClick={onLogout}
                                    icon={LogOut}
                                    label="Cerrar Sesión"
                                    danger={true}
                                    className="w-full text-left !justify-start"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
