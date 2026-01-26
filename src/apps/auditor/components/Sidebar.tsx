import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Brain, Home, Wallet, Moon, Sun, ClipboardList } from 'lucide-react';
import { User } from '../../../shared/types/user';

interface SidebarProps {
    currentView?: string;
    onNavigate?: (view: any) => void;
    isDark: boolean;
    toggleTheme: () => void;
    user: User | null;
    onLogout: () => void;
    onEditProfile: () => void;
    onOpenAdmin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    currentView,
    onNavigate,
    isDark,
    toggleTheme,
    user
}) => {
    return (
        <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 z-40 p-4 pointer-events-none" style={{ height: '100dvh' }}>
            {/* Glass Panel Container */}
            <div className="flex-1 bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl relative pointer-events-auto transition-colors duration-300">

                {/* Decorative Internal Glow */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Brand */}
                    <div className="h-20 lg:h-24 flex flex-row items-center justify-start lg:px-6 border-b border-slate-200/50 dark:border-white/5 relative">
                        <div className="flex items-center lg:w-full">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/20 blur-lg rounded-full"></div>
                                <ShieldCheck className="w-8 h-8 text-emerald-500 relative z-10" />
                            </div>
                            <div className="hidden lg:block ml-4">
                                <h1 className="font-serif font-bold text-xl tracking-widest text-slate-900 dark:text-white">
                                    AUDITORIA <span className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">MEDICA</span>
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="mt-6 px-2 lg:px-4 space-y-1">
                        <Link
                            to="/auditor?view=emergencies"
                            className={`w-full flex items-center justify-center lg:justify-start px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${currentView === 'emergencies'
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)] border border-red-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 group-hover:scale-110 ${currentView === 'emergencies' ? 'text-red-500' : ''}`}>
                                <path d="M2.5 12c0-4.25 3.25-7.5 7.5-7.5 2.5 0 5 1.25 7 2" /><path d="M12 2.5C13.5 4 15 5 15.5 7" /><path d="M13 11.5c0 1.38-1.12 2.5-2.5 2.5S8 12.88 8 11.5 9.12 9 10.5 9s2.5 1.12 2.5 2.5" /><path d="M19 9c0 3.37-2.63 6-6 6" /><path d="M18 13a8 8 0 0 1-16 0" /><path d="M22 12h-2m-12 4v2m6-10v2m6 4h-2" />
                            </svg>
                            <span className="hidden lg:block ml-4 font-bold text-sm tracking-wide">
                                Emergencias
                            </span>
                            {/* Hover Glint */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                        </Link>

                        <Link
                            to="/auditor?view=records"
                            className={`w-full flex items-center justify-center lg:justify-start px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${currentView === 'records'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                        >
                            <ClipboardList className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${currentView === 'records' ? 'text-emerald-500' : ''}`} />
                            <span className="hidden lg:block ml-4 font-bold text-sm tracking-wide">
                                Expedientes
                            </span>
                            {/* Hover Glint */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                        </Link>
                    </nav>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex flex-col gap-2">

                    {/* Global Navigation Row */}
                    <div className="hidden lg:grid grid-cols-5 gap-1">
                        <button
                            onClick={() => window.history.back()}
                            className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm group"
                            title="Atrás"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        </button>

                        <Link
                            to="/"
                            className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm group"
                            title="Inicio"
                        >
                            <Home size={18} className="group-hover:scale-110 transition-transform" />
                        </Link>

                        <Link
                            to="/magnus"
                            className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-theme-gold hover:border-theme-gold/30 transition-all shadow-sm group"
                            title="Ir a Mentoria"
                        >
                            <Brain size={18} className="group-hover:rotate-12 transition-transform" />
                        </Link>

                        <Link
                            to="/finanza"
                            className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-500 hover:border-blue-500/30 transition-all shadow-sm group"
                            title="Ir a Finanzas"
                        >
                            <Wallet size={18} className="group-hover:rotate-12 transition-transform" />
                        </Link>

                        <Link
                            to="/auditor"
                            className="flex items-center justify-center p-2 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400 group relative overflow-hidden"
                            title="Auditoría (Actual)"
                        >
                            <ShieldCheck size={18} className="relative z-10" />
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </Link>
                    </div>


                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-200 group border border-transparent hover:border-slate-200 dark:hover:border-white/5"
                    >
                        {isDark ? (
                            <>
                                <Sun size={20} className="text-theme-gold group-hover:rotate-180 transition-transform duration-500" />
                                <span className="text-sm font-medium">Modo Claro</span>
                            </>
                        ) : (
                            <>
                                <Moon size={20} className="group-hover:-rotate-12 transition-transform duration-300" />
                                <span className="text-sm font-medium">Modo Oscuro</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
};
