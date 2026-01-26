import React, { useState } from 'react';
import { User, Lock, Trophy, ArrowRight } from 'lucide-react';
import { authService } from '../../services/auth';
import * as Types from '../../types'; // Fix for type import if needed, or import User directly

interface LoginProps {
    onLoginSuccess: (user: Types.User) => void;
    onNavigateToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const user = await authService.login(username, password);
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-theme-dark relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-theme-gold/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md p-8 relative z-10 animate-fade-in">
                <div className="text-center mb-10">
                    <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-theme-gold/10 text-theme-gold mb-6 border border-theme-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                        <Trophy className="w-8 h-8" />
                    </div>
                    <h1 className="font-serif text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-widest uppercase">
                        Magnus <span className="text-theme-gold">System</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-xs uppercase tracking-widest">
                        Identificación Requerida
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-theme-card p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-white/5">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Usuario</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-theme-dark border border-slate-200 dark:border-white/10 rounded-lg py-3 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:border-theme-gold focus:outline-none transition-colors"
                                    placeholder="Ingrese su usuario"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-theme-dark border border-slate-200 dark:border-white/10 rounded-lg py-3 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:border-theme-gold focus:outline-none transition-colors"
                                    placeholder="Ingrese su contraseña"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-theme-gold hover:bg-yellow-500 text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isLoading ? 'Accediendo...' : 'Iniciar Sesión'}
                        {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        ¿No tienes acceso?{' '}
                        <button
                            onClick={onNavigateToRegister}
                            className="text-theme-gold hover:text-white font-bold hover:underline transition-colors"
                        >
                            Registrar cuenta
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
