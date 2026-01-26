import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types/user';
import { ThemeToggle } from '../ThemeToggle';
import { LogOut, LayoutDashboard, Brain, Sun, Moon, ArrowRight, Settings, Wallet, Briefcase, Command, Zap, Star, Crown, Shield, Construction, PieChart } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SettingsModal } from './SettingsModal';
import { AdminPanel } from '../../../apps/magnus/components/admin/AdminPanel';
import { ParticlesBackground } from '../ui/ParticlesBackground';
import { WelcomeIntro } from './WelcomeIntro';
import { HomeHeader } from './HomeHeader';
import { UpdatesWidget } from './UpdatesWidget';
import { ServerServices } from './ServerServices';
import { useChat } from '../../context/ChatContext';
import { useTime } from '../../../context/TimeContext';

const DateTimeWidget = () => {
    const { currentTime } = useTime();

    const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    };
    const dateString = currentTime.toLocaleDateString('es-ES', dateOptions);

    const timeString = currentTime.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="text-center mb-8 animate-fade-in">
            <h2 className="text-7xl md:text-8xl font-serif font-bold text-slate-800 dark:text-white tracking-tighter mb-2 drop-shadow-sm dark:drop-shadow-2xl">
                {timeString}
            </h2>
            <p className="text-sm text-theme-gold uppercase tracking-[0.3em] font-medium opacity-80">
                {dateString}
            </p>
        </div>
    );
};

const ICON_MAP: Record<string, any> = {
    Brain,
    LayoutDashboard,
    Wallet,
    Briefcase,
    Command,
    Zap,
    Star,
    Crown,
    PieChart
};

export const Home = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
    const { theme, toggleTheme } = useTheme();
    const [currentUser, setCurrentUser] = useState(user);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { openChat } = useChat();
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const { currentTime } = useTime(); // Need time for the greeting logic

    // Update local user state if prop changes
    useEffect(() => {
        setCurrentUser(user);
    }, [user]);

    const handleUserUpdate = (updated: User) => {
        setCurrentUser(updated);
    };

    // Welcome Intro Logic
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        const hasSeenWelcome = sessionStorage.getItem('welcome_shown');
        if (!hasSeenWelcome) {
            setShowWelcome(true);
        }
    }, []);

    const handleCloseWelcome = () => {
        setShowWelcome(false);
        sessionStorage.setItem('welcome_shown', 'true');
    };

    const handleLogoutWrapper = () => {
        sessionStorage.removeItem('welcome_shown');
        onLogout();
    };

    const MagnusIcon = ICON_MAP[currentUser.preferences?.magnusIcon || 'Brain'] || Brain;
    const FinanzaIcon = ICON_MAP[currentUser.preferences?.finanzaIcon || 'PieChart'] || PieChart;

    const isAdmin = currentUser.role === 'admin' || currentUser.username.toLowerCase() === 'soberano';

    // Greeting Logic
    const getGreeting = () => {
        const h = currentTime.getHours();
        if (h >= 5 && h < 12) return "Buenos días,";
        if (h >= 12 && h < 19) return "Buenas tardes,";
        return "Buenas noches,";
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-white flex flex-col items-center justify-center font-sans relative overflow-hidden transition-colors duration-500">

            {/* Ambient Background - Ceramic Dark Style */}
            <div className="absolute inset-0 bg-slate-50 dark:bg-[#050505]">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 dark:opacity-10 pointer-events-none"></div>
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-theme-gold/20 dark:bg-theme-gold/5 rounded-full blur-[100px] dark:blur-[150px] animate-pulse-slow pointer-events-none"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-500/10 dark:bg-blue-900/10 rounded-full blur-[100px] dark:blur-[150px] animate-pulse-slow animation-delay-2000 pointer-events-none"></div>
            </div>

            {/* Particles Layer */}
            <ParticlesBackground />

            {/* Top Left Greeting - Absolute Position */}
            <div className="absolute top-6 left-6 z-50 animate-fade-in text-left">
                <p className="text-slate-500 dark:text-slate-400 text-lg font-light italic mb-0">
                    {getGreeting()}
                </p>
                <h3 className="text-3xl font-serif font-bold text-slate-800 dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-md">
                    {currentUser.name}
                </h3>
            </div>

            {/* Header Controls */}
            <HomeHeader
                user={currentUser}
                theme={theme}
                toggleTheme={toggleTheme}
                isAdmin={isAdmin}
                onOpenAdmin={() => setIsAdminOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenChat={openChat}
                onLogout={handleLogoutWrapper}
            />

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-6xl px-6 flex flex-col items-center pt-20 pb-8">

                <DateTimeWidget />

                {/* Greeting removed from here, moved to top-left */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
                    {/* Magnus Card */}
                    <Link to="/magnus" className="group relative">
                        <div className="absolute inset-0 bg-theme-gold/10 dark:bg-theme-gold/5 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="relative h-full bg-white/80 dark:bg-[#111] border border-slate-200 dark:border-white/5 rounded-[32px] p-8 flex flex-col items-center text-center transition-all duration-500 hover:border-theme-gold/50 dark:hover:border-theme-gold/30 hover:bg-white dark:hover:bg-[#161616] hover:-translate-y-2 hover:shadow-2xl hover:shadow-theme-gold/10 dark:hover:shadow-theme-gold/5 overflow-hidden backdrop-blur-sm">

                            {/* Inner Glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-theme-gold/10 dark:bg-theme-gold/5 rounded-full blur-3xl -mr-20 -mt-20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-slate-100 dark:border-white/5 flex items-center justify-center text-theme-gold mb-6 shadow-md dark:shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-500">
                                <MagnusIcon size={32} />
                            </div>

                            <h2 className="text-2xl font-serif font-bold text-slate-800 dark:text-slate-200 mb-3 group-hover:text-theme-gold transition-colors relative z-10">
                                Mentoria
                            </h2>
                            <p className="text-xs text-slate-500 leading-relaxed mb-6 relative z-10 font-light">
                                Estrategia, conocimiento y mapas mentales.
                            </p>

                            <div className="mt-auto flex items-center text-[10px] font-bold text-theme-gold uppercase tracking-[0.2em] gap-2 opacity-60 group-hover:opacity-100 transition-all relative z-10">
                                Ingresar <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    {/* Finanza Card */}
                    <Link to="/finanza" className="group relative">
                        <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/5 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="relative h-full bg-white/80 dark:bg-[#111] border border-slate-200 dark:border-white/5 rounded-[32px] p-8 flex flex-col items-center text-center transition-all duration-500 hover:border-blue-500/50 dark:hover:border-blue-500/30 hover:bg-white dark:hover:bg-[#161616] hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 overflow-hidden backdrop-blur-sm">

                            {/* Inner Glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-slate-100 dark:border-white/5 flex items-center justify-center text-blue-500 dark:text-blue-400 mb-6 shadow-md dark:shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-500">
                                <FinanzaIcon size={32} />
                            </div>

                            <h2 className="text-2xl font-serif font-bold text-slate-800 dark:text-slate-200 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors relative z-10">
                                Finanzas
                            </h2>
                            <p className="text-xs text-slate-500 leading-relaxed mb-6 relative z-10 font-light">
                                Control de presupuesto y proyecciones.
                            </p>

                            <div className="mt-auto flex items-center text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em] gap-2 opacity-60 group-hover:opacity-100 transition-all relative z-10">
                                Gestionar <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    {/* Auditor Card */}
                    <Link to="/auditor" className="group relative">
                        <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="relative h-full bg-white/80 dark:bg-[#111] border border-slate-200 dark:border-white/5 rounded-[32px] p-8 flex flex-col items-center text-center transition-all duration-500 hover:border-emerald-500/50 dark:hover:border-emerald-500/30 hover:bg-white dark:hover:bg-[#161616] hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5 overflow-hidden backdrop-blur-sm">

                            {/* Inner Glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-slate-100 dark:border-white/5 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-6 shadow-md dark:shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-500">
                                <Shield size={32} />
                            </div>

                            <h2 className="text-2xl font-serif font-bold text-slate-800 dark:text-slate-200 mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors relative z-10">
                                Auditoría
                            </h2>
                            <p className="text-xs text-slate-500 leading-relaxed mb-6 relative z-10 font-light">
                                Registro, control y gestión de expedientes.
                            </p>

                            <div className="mt-auto flex items-center text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.2em] gap-2 opacity-60 group-hover:opacity-100 transition-all relative z-10">
                                Acceder <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>

                </div>

                {/* Server Services Quick Links */}
                <ServerServices />

                {/* Updates / Changelog Section */}
                <UpdatesWidget />
            </div>

            {/* Footer Signature */}
            <div className="absolute bottom-6 text-center w-full pointer-events-none">
                <p className="text-[10px] text-slate-400 dark:text-slate-700 font-mono tracking-[0.3em] uppercase opacity-50 mix-blend-screen">
                    Magnus S.O. v2.0
                </p>
            </div>


            {
                showWelcome && (
                    <WelcomeIntro
                        userName={currentUser.name}
                        onClose={handleCloseWelcome}
                    />
                )
            }

            <SettingsModal
                user={currentUser}
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onUpdateUser={handleUserUpdate}
            />

            {
                isAdmin && isAdminOpen && (
                    <AdminPanel
                        currentUser={currentUser}
                        onClose={() => setIsAdminOpen(false)}
                    />
                )
            }
        </div >
    );
};
