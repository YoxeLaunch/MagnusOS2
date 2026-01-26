import React, { useState } from 'react';
import { User, Lock, Trophy, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/auth';
import { User as UserType } from '../../types/user';

interface LoginProps {
    onLoginSuccess: (user: UserType) => void;
    onNavigateToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden text-white selection:bg-theme-gold/30">

            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[url('/images/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5"></div>

            <div className="w-full max-w-md p-6 relative z-10 animate-fade-in-up">

                {/* Main Card */}
                <div className="bg-zinc-900/40 border border-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl relative overflow-hidden group">

                    {/* Top Highlight Line */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-theme-gold/30 to-transparent"></div>

                    <div className="text-center mb-8 relative">
                        <div className="inline-flex justify-center items-center w-20 h-20 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700 mb-6 shadow-lg group-hover:shadow-theme-gold/10 transition-all duration-500">
                            <Trophy className="w-8 h-8 text-theme-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                        </div>
                        <h1 className="font-serif text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 mb-2 tracking-widest uppercase">
                            MAGNUS <span className="text-theme-gold">SYSTEM</span>
                        </h1>
                        <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em]">
                            Acceso Autorizado
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg text-center font-medium backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Username Input */}
                            <div className="group space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1 group-focus-within:text-theme-gold transition-colors">Usuario</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-zinc-500 group-focus-within:text-theme-gold transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-zinc-950/50 border border-white/10 text-white text-sm rounded-xl focus:ring-1 focus:ring-theme-gold focus:border-theme-gold block w-full pl-12 p-4 placeholder-zinc-700 transition-all duration-300 focus:bg-zinc-900/80 outline-none"
                                        placeholder="Identificador"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="group space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1 group-focus-within:text-theme-gold transition-colors">Contraseña</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-theme-gold transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-zinc-950/50 border border-white/10 text-white text-sm rounded-xl focus:ring-1 focus:ring-theme-gold focus:border-theme-gold block w-full pl-12 pr-12 p-4 placeholder-zinc-700 transition-all duration-300 focus:bg-zinc-900/80 outline-none"
                                        placeholder="Clave de Acceso"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white transition-colors p-2"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-theme-gold to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.01] shadow-lg hover:shadow-theme-gold/25 mt-4"
                        >
                            {isLoading ? 'Accediendo...' : 'INICIAR SESIÓN'}
                            {!isLoading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={onNavigateToRegister}
                            className="text-zinc-600 hover:text-theme-gold text-xs font-bold uppercase tracking-wider transition-colors hover:underline underline-offset-4"
                        >
                            Crear Nueva Cuenta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
