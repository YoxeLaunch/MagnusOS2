import React, { useState } from 'react';
import { Sun, Moon, Shield, Settings, LogOut, Menu, X, MessageSquare } from 'lucide-react';
import { User } from '../../types/user';
import { AnimatePresence, motion } from 'framer-motion';

interface HomeHeaderProps {
    user: User;
    theme: string;
    toggleTheme: () => void;
    isAdmin: boolean;
    onOpenAdmin: () => void;
    onOpenSettings: () => void;
    onOpenChat: () => void;
    onLogout: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
    user, theme, toggleTheme, isAdmin, onOpenAdmin, onOpenSettings, onOpenChat, onLogout
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Common Button Component for consistency
    const ActionButton = ({ onClick, icon: Icon, label, className = "", danger = false }: any) => (
        <button
            onClick={onClick}
            className={`p-3 rounded-full transition-all backdrop-blur-sm shadow-sm flex items-center gap-3 ${danger
                ? "bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white"
                : "bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
                } ${className}`}
            title={label}
        >
            <Icon size={20} />
            {/* Show label only in mobile menu list context */}
            <span className="md:hidden font-bold">{label}</span>
        </button>
    );

    return (
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50 flex items-center gap-4">

            {/* Theme Toggle (Always Visible) */}
            <button
                onClick={toggleTheme}
                className="p-3 rounded-full bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all backdrop-blur-sm shadow-sm"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* --- DESKTOP VIEW (MD+) --- */}
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-white/10">
                <span className="text-sm text-right">
                    <span className="block text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cuenta Activa</span>
                    <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>
                </span>

                {isAdmin && (
                    <button
                        onClick={onOpenAdmin}
                        className="p-3 rounded-full bg-theme-gold/10 hover:bg-theme-gold text-theme-gold hover:text-black transition-all backdrop-blur-sm shadow-sm"
                        title="Panel Soberano"
                    >
                        <Shield size={20} />
                    </button>
                )}

                <ActionButton onClick={onOpenChat} icon={MessageSquare} label="Chat Global" />

                <ActionButton onClick={onOpenSettings} icon={Settings} label="Configuración" />

                <button
                    onClick={onLogout}
                    className="p-3 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all duration-300 group"
                    title="Cerrar Sesión"
                >
                    <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* --- MOBILE VIEW (Hamburger) --- */}
            <div className="md:hidden">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-3 rounded-full bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white"
                >
                    {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20 }}
                            className="absolute top-16 right-0 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-2 origin-top-right"
                        >
                            <div className="pb-4 border-b border-slate-100 dark:border-white/5 mb-2">
                                <span className="block text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hola,</span>
                                <span className="font-bold text-lg text-slate-900 dark:text-white">{user.name}</span>
                            </div>

                            {isAdmin && (
                                <ActionButton
                                    onClick={() => { onOpenAdmin(); setIsMenuOpen(false); }}
                                    icon={Shield}
                                    label="Panel Soberano"
                                    className="w-full text-left !justify-start hover:text-theme-gold"
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
    );
};
