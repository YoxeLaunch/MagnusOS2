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
import { useChat } from '../../context/ChatContext';

import { useTime } from '../../../context/TimeContext';

const DateTimeWidget = () => {
    const { currentTime } = useTime();

    const hours = currentTime.getHours();
    const isMorning = hours >= 5 && hours < 12;
    const isAfternoon = hours >= 12 && hours < 19;

    let greeting = "Buenas noches";
    if (isMorning) greeting = "Buenos días";
    else if (isAfternoon) greeting = "Buenas tardes";

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
            <h2 className="text-6xl md:text-8xl font-bold text-slate-900 dark:text-white font-mono tracking-tighter mb-2">
                {timeString}
            </h2>
            <p className="text-xl text-theme-gold uppercase tracking-widest font-serif">
                {dateString}
            </p>
            <div className="h-1 w-24 bg-theme-gold/30 mx-auto my-6 rounded-full"></div>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
                <span className="font-light">{greeting},</span>
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

    // Update local user state if prop changes (though we mostly drive from local after edit)
    useEffect(() => {
        setCurrentUser(user);
    }, [user]);

    const handleUserUpdate = (updated: User) => {
        setCurrentUser(updated);
        // We could also notify parent to update global state if needed, but for now local visual update is key
    };

    // Welcome Intro Logic
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        // Check if we've shown the welcome message in this session
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
        // Clear session flag on logout so it appears again next time
        sessionStorage.removeItem('welcome_shown');
        onLogout();
    };

    const MagnusIcon = ICON_MAP[currentUser.preferences?.magnusIcon || 'Brain'] || Brain;
    const FinanzaIcon = ICON_MAP[currentUser.preferences?.finanzaIcon || 'PieChart'] || PieChart;

    const isAdmin = currentUser.role === 'admin' || currentUser.username.toLowerCase() === 'soberano';

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex flex-col items-center justify-center font-sans relative overflow-hidden transition-colors duration-500">

            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-theme-gold/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Particles Layer */}
            <ParticlesBackground />

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
            <div className="relative z-10 w-full max-w-6xl px-6 flex flex-col items-center">

                <DateTimeWidget />
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white mb-12 text-center">
                    {currentUser.name}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {/* Magnus Card */}
                    <Link to="/magnus" className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-theme-gold/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/10 p-8 rounded-2xl transition-all duration-500 transform group-hover:-translate-y-2 group-hover:shadow-2xl overflow-hidden h-full flex flex-col items-center text-center hover-magic-border border-gold">

                            <div className="absolute top-0 right-0 p-24 bg-theme-gold/10 rounded-full blur-2xl -mr-12 -mt-12 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-theme-gold to-yellow-600 flex items-center justify-center text-black shadow-lg shadow-theme-gold/20 mb-6 group-hover:scale-110 transition-transform duration-500 relative z-10">
                                <MagnusIcon size={32} />
                            </div>

                            <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-3 group-hover:text-theme-gold transition-colors relative z-10">
                                Mentoria Magnus
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed relative z-10">
                                Sistema operativo personal. Gestión de estrategia, mapas mentales y mentorías.
                            </p>

                            <div className="mt-auto flex items-center text-xs font-bold text-theme-gold uppercase tracking-widest gap-2 opacity-60 group-hover:opacity-100 transition-all relative z-10">
                                Ingresar <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    {/* Finanza Card */}
                    <Link to="/finanza" className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/10 p-8 rounded-2xl transition-all duration-500 transform group-hover:-translate-y-2 group-hover:shadow-2xl overflow-hidden h-full flex flex-col items-center text-center hover-magic-border border-blue">

                            <div className="absolute top-0 right-0 p-24 bg-blue-500/10 rounded-full blur-2xl -mr-12 -mt-12 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-6 group-hover:scale-110 transition-transform duration-500 relative z-10">
                                <FinanzaIcon size={32} />
                            </div>

                            <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-500 transition-colors relative z-10">
                                Presupuesto Magnus
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed relative z-10">
                                Control financiero avanzado. Presupuestos, seguimiento de gastos y proyecciones.
                            </p>

                            <div className="mt-auto flex items-center text-xs font-bold text-blue-500 uppercase tracking-widest gap-2 opacity-60 group-hover:opacity-100 transition-all relative z-10">
                                Gestionar <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    {/* New Third Card (Construction) */}
                    <div className="group relative opacity-60 hover:opacity-100 grayscale transition-all duration-500">
                        <div className="relative bg-card-light dark:bg-card-dark border border-slate-200 dark:border-white/10 p-8 rounded-2xl h-full flex flex-col items-center text-center border-dashed">

                            <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-6">
                                <Construction size={32} />
                            </div>

                            <h2 className="text-2xl font-serif font-bold text-slate-400 dark:text-slate-500 mb-3">
                                En Construcción
                            </h2>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 leading-relaxed">
                                Próximamente nueva sección disponible.
                            </p>

                            <div className="mt-auto flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest gap-2">
                                Próximamente
                            </div>
                        </div>
                    </div>

                </div>

                {/* Updates / Changelog Section */}
                <UpdatesWidget />
            </div>

            <div className="absolute bottom-6 text-center w-full">
                <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono tracking-[0.3em] uppercase opacity-50">
                    Sistema Integral de Gestión M v2.0
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
