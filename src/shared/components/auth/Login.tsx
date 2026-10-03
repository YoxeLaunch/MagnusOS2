import React, { useState, useEffect } from 'react';
import {
    User,
    Lock,
    Trophy,
    ArrowRight,
    ArrowLeft,
    Eye,
    EyeOff,
    LogIn,
    UserPlus,
    TrendingUp,
    Database,
    Target,
    ShieldCheck,
    Network,
    Info,
    CheckCircle2,
    X
} from 'lucide-react';
import { authService } from '../../services/auth';
import { User as UserType } from '../../types/user';

interface LoginProps {
    onLoginSuccess: (user: UserType) => void;
    onNavigateToRegister?: () => void;
    initialMode?: 'login' | 'register';
}

export const Login: React.FC<LoginProps> = ({
    onLoginSuccess,
    initialMode = 'login'
}) => {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);
    
    // Login form state
    const [username, setUsername] = useState(() => {
        return localStorage.getItem('magnus_remember_user') || '';
    });
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    // Register form state
    const [regUsername, setRegUsername] = useState('');
    const [regName, setRegName] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

    // Feedback & modal states
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [showLocalAccessModal, setShowLocalAccessModal] = useState(false);

    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            const user = await authService.login(username, password);
            if (rememberMe) {
                localStorage.setItem('magnus_remember_user', username);
            } else {
                localStorage.removeItem('magnus_remember_user');
            }
            onLoginSuccess(user);
        } catch (err: any) {
            setError(typeof err === 'string' ? err : 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (regPassword !== regConfirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);

        try {
            const newUser = {
                username: regUsername.trim(),
                name: regName.trim(),
                password: regPassword,
                role: 'user' as const
            };

            const user = await authService.register(newUser);
            setSuccessMessage('¡Cuenta creada exitosamente! Conectando...');
            setTimeout(() => {
                onLoginSuccess(user);
            }, 600);
        } catch (err: any) {
            setError(typeof err === 'string' ? err : 'Error al registrar usuario');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLocalAccess = () => {
        setShowLocalAccessModal(true);
    };

    return (
        <div className="min-h-screen bg-[#070a0f] flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans relative overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200">
            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />

            {/* Main Application Container Frame */}
            <div className="w-full max-w-[1240px] rounded-2xl sm:rounded-3xl border border-amber-500/20 bg-zinc-950/90 shadow-[0_0_60px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.06)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">

                {/* LEFT HERO / BANNER SECTION */}
                <div className="lg:col-span-7 xl:col-span-7 relative flex flex-col justify-between p-6 sm:p-10 lg:p-12 min-h-[520px] lg:min-h-[680px] overflow-hidden text-white">
                    {/* Background Image of Providence Cliffside Villa */}
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-100 hover:scale-105 pointer-events-none"
                        style={{
                            backgroundImage: `url('/images/backgrounds/providence-villa.jpg')`,
                        }}
                    />

                    {/* Gradient Overlay for Pristine Readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/75 to-zinc-950/90 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/70 pointer-events-none" />

                    {/* Left Top Bar */}
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.28em] font-semibold text-zinc-300">
                                PROVIDENCE
                            </p>
                            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">
                                LOCAL NETWORK
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-[1px] bg-zinc-600/80" />
                            <span className="font-mono text-xs text-zinc-400 font-medium">v2.0</span>
                        </div>
                    </div>

                    {/* Left Center Content */}
                    <div className="relative z-10 my-8 sm:my-10 max-w-xl">
                        {/* Trophy Icon Emblem */}
                        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.25)] backdrop-blur-md group transition-all duration-300 hover:border-amber-400">
                            <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                        </div>

                        {/* Heading */}
                        <div className="mb-3">
                            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-wide uppercase leading-tight">
                                MAGNUS <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">SYSTEM</span>
                            </h1>
                            <p className="font-mono text-xs sm:text-sm text-zinc-400 uppercase tracking-[0.25em] mt-1.5">
                                TU CENTRO DE CONTROL PERSONAL
                            </p>
                            <div className="w-12 h-0.5 bg-amber-400 mt-3 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
                        </div>

                        {/* Description Text */}
                        <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-lg mb-8 font-normal">
                            {mode === 'login'
                                ? 'Finanzas, análisis, planificación y control en un solo lugar. Diseñado para ayudarte a tomar mejores decisiones, todos los días.'
                                : 'Únete a una red privada diseñada para personas que buscan control, análisis y mejores decisiones en un solo lugar.'}
                        </p>

                        {/* 4 Feature Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* Card 1: Finanzas */}
                            <div className="bg-zinc-950/70 border border-white/10 hover:border-amber-500/50 backdrop-blur-md rounded-xl p-3.5 flex flex-col items-center text-center transition-all duration-300 hover:bg-zinc-900/80 hover:-translate-y-1 shadow-lg group">
                                <TrendingUp className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-white uppercase tracking-wider">FINANZAS</span>
                                <span className="text-[10px] text-zinc-400 mt-0.5">Análisis y control</span>
                            </div>

                            {/* Card 2: Datos */}
                            <div className="bg-zinc-950/70 border border-white/10 hover:border-amber-500/50 backdrop-blur-md rounded-xl p-3.5 flex flex-col items-center text-center transition-all duration-300 hover:bg-zinc-900/80 hover:-translate-y-1 shadow-lg group">
                                <Database className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-white uppercase tracking-wider">DATOS</span>
                                <span className="text-[10px] text-zinc-400 mt-0.5">Todo en un lugar</span>
                            </div>

                            {/* Card 3: Planificación */}
                            <div className="bg-zinc-950/70 border border-white/10 hover:border-amber-500/50 backdrop-blur-md rounded-xl p-3.5 flex flex-col items-center text-center transition-all duration-300 hover:bg-zinc-900/80 hover:-translate-y-1 shadow-lg group">
                                <Target className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-white uppercase tracking-wider">PLANIFICACIÓN</span>
                                <span className="text-[10px] text-zinc-400 mt-0.5">Metas reales</span>
                            </div>

                            {/* Card 4: Seguridad */}
                            <div className="bg-zinc-950/70 border border-white/10 hover:border-amber-500/50 backdrop-blur-md rounded-xl p-3.5 flex flex-col items-center text-center transition-all duration-300 hover:bg-zinc-900/80 hover:-translate-y-1 shadow-lg group">
                                <ShieldCheck className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-white uppercase tracking-wider">SEGURIDAD</span>
                                <span className="text-[10px] text-zinc-400 mt-0.5">Tu información</span>
                            </div>
                        </div>
                    </div>

                    {/* Left Bottom Footer */}
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 border-t border-white/10">
                        <div>
                            <p className="font-mono text-xs sm:text-sm text-zinc-300 italic">
                                &ldquo;Información hoy, mejores decisiones mañana.&rdquo;
                            </p>
                            <div className="w-16 h-0.5 bg-amber-400 mt-1 rounded-full" />
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <div className="w-8 h-0.5 bg-amber-400 rounded-full" />
                            <span className="font-mono text-xs tracking-[0.25em] text-zinc-400 font-bold uppercase">
                                MAGNUS OS2
                            </span>
                        </div>
                    </div>
                </div>

                {/* RIGHT FORM SECTION */}
                <div className="lg:col-span-5 xl:col-span-5 bg-[#0a0e17]/95 lg:border-l border-zinc-800/80 p-6 sm:p-10 flex flex-col justify-between backdrop-blur-xl relative">
                    
                    {/* Top Segmented Tabs: Iniciar Sesión / Crear Cuenta */}
                    <div>
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('login');
                                    setError('');
                                    setSuccessMessage('');
                                }}
                                className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                                    mode === 'login'
                                        ? 'border border-amber-500/80 bg-amber-500/10 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                        : 'border border-zinc-800/80 bg-zinc-900/30 text-zinc-400 hover:text-white hover:border-zinc-700'
                                }`}
                            >
                                <LogIn className="w-4 h-4" />
                                <span>INICIAR SESIÓN</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setMode('register');
                                    setError('');
                                    setSuccessMessage('');
                                }}
                                className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                                    mode === 'register'
                                        ? 'border border-amber-500/80 bg-amber-500/10 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                        : 'border border-zinc-800/80 bg-zinc-900/30 text-zinc-400 hover:text-white hover:border-zinc-700'
                                }`}
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>CREAR CUENTA</span>
                            </button>
                        </div>

                        {/* Title & Subtitle */}
                        <div className="text-center sm:text-left mb-6">
                            {mode === 'login' ? (
                                <>
                                    <h2 className="font-serif text-3xl font-bold text-white mb-1 tracking-tight">
                                        Bienvenido de nuevo
                                    </h2>
                                    <p className="text-xs text-zinc-400 tracking-wide">
                                        Accede a tu espacio en Magnus System
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="font-serif text-3xl font-bold text-white mb-1 tracking-tight">
                                        Crear Cuenta
                                    </h2>
                                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                                        NUEVA ALTA EN MAGNUS SYSTEM
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Error or Success notification */}
                        {error && (
                            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-start gap-2.5 backdrop-blur-sm animate-fade-in">
                                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                                <span>{error}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-start gap-2.5 backdrop-blur-sm animate-fade-in">
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {/* LOGIN FORM VIEW */}
                        {mode === 'login' ? (
                            <form onSubmit={handleLoginSubmit} className="space-y-4">
                                {/* Username */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                                        USUARIO
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full bg-zinc-950/70 border border-zinc-800 text-white text-sm rounded-xl focus:ring-1 focus:ring-amber-400 focus:border-amber-400 block pl-10 pr-4 py-3 placeholder-zinc-600 transition-all outline-none"
                                            placeholder="Tu identificador"
                                            required
                                            autoComplete="username"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                                        CONTRASEÑA
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                                            <Lock className="h-4 w-4" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-zinc-950/70 border border-zinc-800 text-white text-sm rounded-xl focus:ring-1 focus:ring-amber-400 focus:border-amber-400 block pl-10 pr-11 py-3 placeholder-zinc-600 transition-all outline-none"
                                            placeholder="Tu clave de acceso"
                                            required
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-200 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember Me & Forgot Password */}
                                <div className="flex items-center justify-between pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-400/40 accent-amber-500"
                                        />
                                        <span className="text-xs text-zinc-300">Mantener sesión iniciada</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotModal(true)}
                                        className="text-xs text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-amber-500/25 active:scale-[0.99] uppercase tracking-wider text-sm disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <span>ACCEDIENDO...</span>
                                    ) : (
                                        <>
                                            <span>INICIAR SESIÓN</span>
                                            <ArrowRight className="w-4 h-4 stroke-[3]" />
                                        </>
                                    )}
                                </button>

                                {/* Divider */}
                                <div className="flex items-center my-4">
                                    <div className="flex-1 h-[1px] bg-zinc-800" />
                                    <span className="px-3 text-xs text-zinc-500 font-mono">o</span>
                                    <div className="flex-1 h-[1px] bg-zinc-800" />
                                </div>

                                {/* Local Access Button */}
                                <button
                                    type="button"
                                    onClick={handleLocalAccess}
                                    className="w-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-colors text-xs font-semibold uppercase tracking-wider"
                                >
                                    <Network className="w-4 h-4 text-amber-400/90" />
                                    <span>ACCESO LOCAL</span>
                                    <span className="text-[10px] text-zinc-500 font-normal lowercase">
                                        (solo en red local)
                                    </span>
                                </button>
                            </form>
                        ) : (
                            /* REGISTER FORM VIEW */
                            <form onSubmit={handleRegisterSubmit} className="space-y-4">
                                {/* Critical Information Box */}
                                <div className="p-3.5 bg-blue-950/20 border border-blue-500/20 rounded-xl text-left relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1.5">
                                        <Info className="w-3.5 h-3.5" />
                                        <span>INFORMACIÓN CRÍTICA</span>
                                    </div>
                                    <ul className="text-xs text-zinc-400 space-y-1 pl-4 list-disc">
                                        <li>
                                            <strong className="text-zinc-200">Usuario:</strong> Tu ID de acceso único (ej: juan.perez).
                                        </li>
                                        <li>
                                            <strong className="text-zinc-200">Nombre:</strong> Como serás identificado por otros (ej: Juan Pérez).
                                        </li>
                                    </ul>
                                </div>

                                {/* Grid: Usuario & Nombre */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                                            USUARIO
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <input
                                                type="text"
                                                value={regUsername}
                                                onChange={(e) => setRegUsername(e.target.value)}
                                                className="w-full bg-zinc-950/70 border border-zinc-800 text-white text-sm rounded-xl focus:ring-1 focus:ring-amber-400 focus:border-amber-400 block pl-10 pr-3 py-3 placeholder-zinc-600 transition-all outline-none"
                                                placeholder="usuario.id"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                                            NOMBRE REAL
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <input
                                                type="text"
                                                value={regName}
                                                onChange={(e) => setRegName(e.target.value)}
                                                className="w-full bg-zinc-950/70 border border-zinc-800 text-white text-sm rounded-xl focus:ring-1 focus:ring-amber-400 focus:border-amber-400 block pl-10 pr-3 py-3 placeholder-zinc-600 transition-all outline-none"
                                                placeholder="Nombre Apellido"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                                        CONTRASEÑA
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                                            <Lock className="h-4 w-4" />
                                        </div>
                                        <input
                                            type={showRegPassword ? 'text' : 'password'}
                                            value={regPassword}
                                            onChange={(e) => setRegPassword(e.target.value)}
                                            className="w-full bg-zinc-950/70 border border-zinc-800 text-white text-sm rounded-xl focus:ring-1 focus:ring-amber-400 focus:border-amber-400 block pl-10 pr-11 py-3 placeholder-zinc-600 transition-all outline-none"
                                            placeholder="Tu clave de acceso"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRegPassword(!showRegPassword)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-200 transition-colors"
                                        >
                                            {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                                        CONFIRMAR
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-400 transition-colors">
                                            <Lock className="h-4 w-4" />
                                        </div>
                                        <input
                                            type={showRegConfirmPassword ? 'text' : 'password'}
                                            value={regConfirmPassword}
                                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                                            className="w-full bg-zinc-950/70 border border-zinc-800 text-white text-sm rounded-xl focus:ring-1 focus:ring-amber-400 focus:border-amber-400 block pl-10 pr-11 py-3 placeholder-zinc-600 transition-all outline-none"
                                            placeholder="Repite tu clave de acceso"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-200 transition-colors"
                                        >
                                            {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Finalize Register Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-amber-500/25 active:scale-[0.99] uppercase tracking-wider text-sm disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <span>REGISTRANDO...</span>
                                    ) : (
                                        <>
                                            <span>FINALIZAR REGISTRO</span>
                                            <ArrowRight className="w-4 h-4 stroke-[3]" />
                                        </>
                                    )}
                                </button>

                                {/* Divider */}
                                <div className="flex items-center my-4">
                                    <div className="flex-1 h-[1px] bg-zinc-800" />
                                    <span className="px-3 text-xs text-zinc-500 font-mono">o</span>
                                    <div className="flex-1 h-[1px] bg-zinc-800" />
                                </div>

                                {/* Back to Login Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('login');
                                        setError('');
                                    }}
                                    className="w-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs font-semibold uppercase tracking-wider"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Volver al inicio de sesión</span>
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Bottom Security Notice */}
                    <div className="mt-8 pt-4 border-t border-zinc-900/80 flex items-center justify-center gap-2 text-zinc-500 text-[11px]">
                        <Lock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>
                            {mode === 'login'
                                ? 'Conexión segura • Tus datos permanecen en Providence'
                                : 'Registro seguro • Tus datos permanecen en Providence'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
                        <button
                            onClick={() => setShowForgotModal(false)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-serif font-bold mb-2">Restablecer Contraseña</h3>
                        <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                            En la red local privada <span className="text-amber-400 font-semibold">Providence</span>, las credenciales no dependen de servicios de correo externos.
                        </p>
                        <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-800 text-xs text-zinc-400 space-y-2 mb-6">
                            <p>• Si eres el administrador del sistema, puedes restablecer las claves o crear nuevos accesos mediante la consola CLI o la base de datos local.</p>
                            <p>• Si eres un usuario estándar, por favor solicita a tu administrador de red local que actualice tu clave desde el Centro de Comando.</p>
                        </div>
                        <button
                            onClick={() => setShowForgotModal(false)}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* Local Access Modal */}
            {showLocalAccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
                        <button
                            onClick={() => setShowLocalAccessModal(false)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
                            <Network className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-serif font-bold mb-2">Acceso a Red Local</h3>
                        <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                            Magnus OS2 está operando en entorno privado seguro en Providence.
                        </p>
                        <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-800 text-xs text-zinc-400 space-y-2 mb-6">
                            <p>Para ingresar al sistema, introduce tu nombre de usuario y contraseña en el formulario.</p>
                            {localStorage.getItem('magnus_remember_user') && (
                                <p className="text-amber-400">
                                    Último usuario recordado: <strong>{localStorage.getItem('magnus_remember_user')}</strong>
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                const remembered = localStorage.getItem('magnus_remember_user');
                                if (remembered) {
                                    setUsername(remembered);
                                }
                                setShowLocalAccessModal(false);
                            }}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
                        >
                            Continuar al Formulario
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
