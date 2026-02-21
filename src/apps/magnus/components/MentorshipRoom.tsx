import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, GraduationCap, Lock, Unlock, BookOpen } from 'lucide-react';
import { db } from '../services/database';
import { apiFetch } from '../../../../shared/utils/apiFetch';

export interface Mentor {
    id: string;
    month: number;
    name: string;
    role: string;
    quote: string;
    image: string;
    quotes?: string[];
    startDate?: string;
    endDate?: string;
}

interface Mission {
    id: string;
    text: string;
    week: number;
    isCompleted: boolean;
    moduleId: string;
}

interface Module {
    id: string;
    title: string;
    description: string;
    missions: Mission[];
    order: number;
}

export const MentorshipRoom: React.FC<{ user: any }> = ({ user }) => {
    // START DATE: Live Date (Defaults to Today to show The Creator in Dec 2025)
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarEvents, setCalendarEvents] = useState<Record<string, boolean>>({});

    // Mentor State
    const [mentor, setMentor] = useState<Mentor | null>(null);
    const [nextMentor, setNextMentor] = useState<Mentor | null>(null);
    const [displayMentor, setDisplayMentor] = useState<Mentor | null>(null);
    const [showNextLabel, setShowNextLabel] = useState(false);
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

    // Curriculum State
    const [modules, setModules] = useState<Module[]>([]);
    const [currentModule, setCurrentModule] = useState<Module | null>(null);

    // Initial Data Load
    useEffect(() => {
        // Preload all mentor images for smooth transitions
        apiFetch('/api/mentors').then(r => r.json()).then((mentors: Mentor[]) => {
            mentors.forEach(m => {
                const img = new Image();
                img.src = m.image;
            });
        });

        const loadData = async () => {
            const calendarData = await db.getCalendarData();
            setCalendarEvents(calendarData);
        };
        loadData();

        // 2. Fetch Curriculum (Once)
        apiFetch('/api/curriculum')
            .then(res => res.json())
            .then((data: Module[]) => {
                setModules(data);
                if (data.length > 0) setCurrentModule(data[0]);
            })
            .catch(err => console.error("Error loading curriculum:", err));

    }, []);

    // Date Change Effect (Mentors)
    useEffect(() => {
        // 1. Fetch Mentors
        apiFetch('/api/mentors')
            .then(res => res.json())
            .then((data: Mentor[]) => {
                if (data && data.length > 0) {
                    const viewStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                    const viewEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

                    const active = data.find((m: any) => {
                        if (!m.startDate || !m.endDate) return false;
                        const start = new Date(m.startDate);
                        const end = new Date(m.endDate);
                        // Check if mentor's range overlaps with CURRENT VIEWED MONTH
                        return start <= viewEnd && end >= viewStart;
                    });

                    const currentM = active || null;
                    setMentor(currentM);
                    setDisplayMentor(currentM);

                    // Find Next
                    if (currentM && currentM.endDate) {
                        const currentEnd = new Date(currentM.endDate).getTime();
                        const potentialNext = data.filter((m: any) => new Date(m.startDate).getTime() > currentEnd);
                        potentialNext.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                        setNextMentor(potentialNext[0] || null);
                    } else {
                        setNextMentor(null);
                    }
                }
            })
            .catch(err => console.error("Error loading mentors:", err));
    }, [currentDate]);

    // Rotation Logic
    useEffect(() => {
        if (!mentor || !nextMentor) {
            setDisplayMentor(mentor);
            setShowNextLabel(false);
            return;
        }
        const interval = setInterval(() => {
            setShowNextLabel(prev => !prev);
            setDisplayMentor(prev => (prev === mentor ? nextMentor : mentor));
        }, 8000);
        return () => clearInterval(interval);
    }, [mentor, nextMentor]);

    useEffect(() => {
        setCurrentQuoteIndex(0);
    }, [displayMentor]);

    useEffect(() => {
        if (!displayMentor?.quotes || displayMentor.quotes.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentQuoteIndex(prev => (prev + 1) % (displayMentor!.quotes?.length || 1));
        }, 5000);
        return () => clearInterval(interval);
    }, [displayMentor]);

    const nextQuote = () => { if (displayMentor?.quotes) setCurrentQuoteIndex(prev => (prev + 1) % displayMentor.quotes!.length); };
    const prevQuote = () => { if (displayMentor?.quotes) setCurrentQuoteIndex(prev => (prev - 1 + displayMentor.quotes!.length) % displayMentor.quotes!.length); };

    // Actions
    const toggleMission = async (id: string) => {
        // Optimistic update
        const updatedModules = modules.map(m => ({
            ...m,
            missions: m.missions.map(mis => mis.id === id ? { ...mis, isCompleted: !mis.isCompleted } : mis)
        }));
        setModules(updatedModules);
        if (currentModule) {
            setCurrentModule(updatedModules.find(m => m.id === currentModule.id) || null);
        }

        // API Call
        await apiFetch('/api/curriculum/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missionId: id })
        });
    };

    const toggleDate = async (day: number) => {
        const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
        const val = !calendarEvents[key];
        setCalendarEvents({ ...calendarEvents, [key]: val });
        await db.toggleCalendarDate(key, val);
    };

    // Calculate Progress
    const allMissions = modules.flatMap(m => m.missions);
    const completed = allMissions.filter(m => m.isCompleted).length;
    const progress = allMissions.length > 0 ? (completed / allMissions.length) * 100 : 0;

    return (
        <div className="px-6 lg:px-12 pb-6 lg:pb-12 pt-0 lg:pt-2 max-w-7xl mx-auto space-y-8 animate-fade-in h-full flex flex-col">
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-6">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-widest uppercase flex items-center gap-3">
                        Sala de Mentorías
                        {user?.tags?.includes('VIP') && (
                            <span className="bg-theme-gold/10 text-theme-gold text-xs px-2 py-1 rounded-full border border-theme-gold/20 flex items-center gap-1 tracking-normal font-sans">
                                <GraduationCap size={14} /> VIP MEMBER
                            </span>
                        )}
                    </h2>
                    <p className="text-theme-gold font-mono text-xs mt-1">SISTEMA DE SOBERANÍA 2026</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500 dark:text-slate-400">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="text-center w-32">
                        <span className="block text-2xl font-serif font-bold text-slate-900 dark:text-white uppercase transition-all duration-300">
                            {currentDate.toLocaleString('es-ES', { month: 'long' })}
                        </span>
                        <span className="block text-[10px] text-slate-500 font-mono tracking-[0.3em]">
                            {currentDate.getFullYear()}
                        </span>
                    </div>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500 dark:text-slate-400">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                {/* Calendar Grid */}
                <div className="lg:col-span-8 bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-2xl flex flex-col hover:border-theme-gold/30 transition-all duration-300">
                    <div className="grid grid-cols-7 mb-4">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                            <div key={day} className="text-center text-[10px] font-bold text-slate-500 dark:text-slate-600 uppercase tracking-wider py-2">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-fr gap-2 flex-1">
                        {Array.from({ length: 42 }).map((_, i) => {
                            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
                            const offset = (firstDay + 6) % 7;
                            const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                            const dayNum = i - offset + 1;

                            if (dayNum <= 0 || dayNum > daysInMonth) return <div key={i} className="" />;

                            const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${dayNum}`;
                            const isMarked = calendarEvents[dateKey];
                            const isToday = dayNum === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                            return (
                                <div
                                    key={i}
                                    onClick={() => toggleDate(dayNum)}
                                    className={`relative p-2 border rounded-lg flex flex-col justify-between cursor-pointer group min-h-[80px] transition-all
                                        ${isMarked ? 'bg-theme-gold/10 border-theme-gold text-theme-gold' : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5'}
                                        ${isToday ? 'ring-2 ring-blue-500' : ''}
                                    `}
                                >
                                    <span className="text-xs font-mono font-bold opacity-70">{dayNum}</span>
                                    {isMarked && <div className="text-[9px] uppercase font-bold tracking-tighter mt-1">Mentoría</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Side Panel */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Mentor Card */}
                    <div className="relative h-[500px] w-full rounded-2xl overflow-hidden group shadow-2xl border-4 border-slate-900 bg-slate-900 ring-1 ring-slate-800">
                        {displayMentor ? (
                            <>
                                <img
                                    src={displayMentor.image}
                                    alt={displayMentor.name}
                                    onError={(e) => {
                                        // Fallback if image fails
                                        e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + displayMentor.name + '&background=0D8ABC&color=fff&size=500';
                                        e.currentTarget.className = "absolute inset-0 w-full h-full object-cover opacity-80"
                                    }}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />

                                {/* Overlay Gradient - Frame Effect */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-90" />
                                <div className="absolute inset-0 border-[1px] border-white/10 rounded-xl m-2 pointer-events-none" />

                                <div className="absolute bottom-0 p-8 w-full z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                    <span className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-2 block ${showNextLabel ? 'text-blue-400 drop-shadow-md' : 'text-theme-gold drop-shadow-md'}`}>
                                        {showNextLabel ? 'PRÓXIMAMENTE' : 'MENTOR ACTIVO'}
                                    </span>
                                    <h3 className="text-3xl font-serif font-bold text-white mb-2 drop-shadow-xl">{displayMentor.name}</h3>
                                    <p className="text-xs text-slate-300 font-mono uppercase tracking-wider mb-6 border-l-2 border-theme-gold pl-3">
                                        {displayMentor.role}
                                    </p>

                                    <div className="relative">
                                        <p className="text-sm italic text-white/90 font-serif leading-relaxed min-h-[60px] drop-shadow-sm">
                                            "{displayMentor.quotes && displayMentor.quotes[currentQuoteIndex]}"
                                        </p>
                                    </div>

                                    {/* Quote Controls */}
                                    {displayMentor.quotes && displayMentor.quotes.length > 1 && (
                                        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={prevQuote} className="p-1 hover:bg-white/10 rounded-full text-white/70 hover:text-white"><ChevronLeft size={16} /></button>
                                            <button onClick={nextQuote} className="p-1 hover:bg-white/10 rounded-full text-white/70 hover:text-white"><ChevronRight size={16} /></button>
                                        </div>
                                    )}
                                </div>

                                {/* Timer / Countdown Overlay */}
                                <div className="absolute top-6 right-6 z-20">
                                    {(showNextLabel && nextMentor?.startDate) ? (
                                        <div className="bg-blue-600/20 text-blue-100 px-4 py-3 rounded-lg backdrop-blur-md border border-blue-500/50 flex flex-col items-center animate-pulse shadow-2xl">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-blue-300">Inicia en</span>
                                            <span className="text-2xl font-mono font-bold text-white filter drop-shadow-lg">
                                                {Math.ceil((new Date(nextMentor.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                                            </span>
                                            <span className="text-[8px] uppercase opacity-70">Días</span>
                                        </div>
                                    ) : (mentor?.endDate && new Date(mentor.endDate) > new Date()) && (
                                        <div className="bg-theme-gold/20 text-theme-gold px-4 py-3 rounded-lg backdrop-blur-md border border-theme-gold/50 flex flex-col items-center shadow-2xl">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-200">Restan</span>
                                            <span className="text-2xl font-mono font-bold text-white filter drop-shadow-lg">
                                                {Math.ceil((new Date(mentor.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                                            </span>
                                            <span className="text-[8px] uppercase opacity-70">Días</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-900/50">
                                <Lock size={48} className="mb-4 opacity-30" />
                                <span className="text-xs uppercase tracking-[0.2em]">Sin Mentor Asignado</span>
                            </div>
                        )}
                    </div>

                    {/* Missions / Curriculum */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-serif font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-theme-gold" />
                                PENSUM / MISIONES
                            </h3>
                            <span className="text-[10px] font-mono text-theme-gold">{Math.round(progress)}% TOTAL</span>
                        </div>

                        {/* Pre-Season Banner */}
                        {new Date().getTime() < new Date(2026, 0, 1).getTime() && (
                            <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-3">
                                <Unlock className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold text-green-600 dark:text-green-500 uppercase tracking-wide">
                                        Acceso Anticipado Habilitado
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                        Puedes interactuar con el Pensum 2026 desde ahora para familiarizarte con el sistema.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Module Selector */}
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                            {modules.map(mod => (
                                <button
                                    key={mod.id}
                                    onClick={() => setCurrentModule(mod)}
                                    className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors
                                        ${currentModule?.id === mod.id
                                            ? 'bg-theme-gold text-black border-theme-gold'
                                            : 'border-slate-300 dark:border-white/10 text-slate-500 hover:border-theme-gold/50'}
                                    `}
                                >
                                    {mod.id}
                                </button>
                            ))}
                        </div>

                        {currentModule ? (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white">{currentModule.title}</h4>
                                <p className="text-[10px] text-slate-500 mb-2">{currentModule.description}</p>

                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {currentModule.missions.map(mission => {
                                        // Calculate if mission is unlocked
                                        // Simple logic: If we are in the month corresponding to the module?
                                        // Better: Let's assume sequential weeks starting Jan 1, 2026.
                                        // Week 1 starts Jan 1.
                                        const PROJECT_START = new Date(2026, 0, 1).getTime();
                                        const now = new Date().getTime();
                                        const msPerWeek = 7 * 24 * 60 * 60 * 1000;

                                        // Mission absolute week number (assuming Mod 1 is Weeks 1-12, Mod 2 is 13-24 etc)
                                        // For now, let's use the local 'week' + module offset. 
                                        // But we lack module offset in DB.
                                        // Temporary: Just check if date >= 2026. If now < 2026, LOCK ALL.

                                        const isPreSeason = now < PROJECT_START;
                                        // Allow interaction even in pre-season as per user request
                                        const isLocked = false;

                                        return (
                                            <button
                                                key={mission.id}
                                                onClick={() => toggleMission(mission.id)}
                                                disabled={false}
                                                className={`w-full flex items-start gap-3 group text-left p-2 rounded transition-colors
                                                    ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-white/5'}
                                                `}
                                            >
                                                <div className={`mt-0.5 ${mission.isCompleted ? 'text-theme-gold' : 'text-slate-300'}`}>
                                                    {isLocked ? <Lock size={16} /> : (mission.isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />)}
                                                </div>
                                                <div>
                                                    <span className={`text-[10px] font-mono font-bold uppercase ${isLocked ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        Semana {mission.week} {isLocked && '(2026)'}
                                                    </span>
                                                    <p className={`text-xs ${mission.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {mission.text}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-xs text-slate-500">
                                Cargando Pensum...
                            </div>
                        )}

                        {/* Progress Bar */}
                        <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-theme-gold transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};