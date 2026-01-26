import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/auth';

interface RegisterProps {
    onRegisterSuccess: (user: any) => void;
    onNavigateToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onNavigateToLogin }) => {
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        password: '',
        confirmPassword: '',
        role: 'user' as const
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);

        try {
            const newUser = {
                username: formData.username,
                name: formData.name,
                password: formData.password,
                role: formData.role
            };

            const user = await authService.register(newUser);
            onRegisterSuccess(user);
        } catch (err: any) {
            setError(err || 'Error al registrar usuario');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-theme-dark relative overflow-hidden py-10">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-theme-gold/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-lg p-6 relative z-10 animate-fade-in">
                <button
                    onClick={onNavigateToLogin}
                    className="flex items-center gap-2 text-slate-500 hover:text-theme-gold transition-colors mb-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold uppercase tracking-wider">Volver al Login</span>
                </button>

                <div className="bg-white dark:bg-theme-card p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-white/5">
                    <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-6">Nueva Alta</h2>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Usuario</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-theme-dark border border-slate-200 dark:border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-theme-gold focus:outline-none transition-colors"
                                        placeholder="john.doe"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-theme-dark border border-slate-200 dark:border-white/10 rounded-lg py-3 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-theme-gold focus:outline-none transition-colors"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-theme-dark border border-slate-200 dark:border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-theme-gold focus:outline-none transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Confirmar Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-theme-dark border border-slate-200 dark:border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-theme-gold focus:outline-none transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 dark:bg-white hover:bg-theme-gold dark:hover:bg-theme-gold text-white dark:text-black hover:text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 mt-6 disabled:opacity-50"
                        >
                            {isLoading ? 'Registrando...' : 'Completar Registro'}
                            {!isLoading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
