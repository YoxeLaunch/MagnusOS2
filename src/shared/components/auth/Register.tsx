import React, { useState } from 'react';
import { User, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, Info } from 'lucide-react';
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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden text-white font-sans selection:bg-theme-gold/30">

            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[url('/images/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5"></div>

            <div className="w-full max-w-lg p-6 relative z-10 animate-fade-in-up">

                {/* Back Button */}
                <div className="mb-6">
                    <button
                        onClick={onNavigateToLogin}
                        className="flex items-center gap-2 text-zinc-500 hover:text-theme-gold transition-colors group"
                    >
                        <div className="p-2 rounded-full border border-white/5 group-hover:border-theme-gold/30 bg-black/20 transition-colors">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Regresar</span>
                    </button>
                </div>

                {/* Main Card */}
                <div className="bg-zinc-900/40 border border-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl relative overflow-hidden">

                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-serif font-bold text-white mb-2">Crear Cuenta</h2>
                        <p className="text-zinc-500 text-xs uppercase tracking-widest">Nueva Alta en Magnus System</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/10 text-red-400 text-sm rounded-xl text-center font-medium">
                            {error}
                        </div>
                    )}

                    {/* Information Box */}
                    <div className="mb-8 p-5 bg-blue-900/10 border border-blue-500/10 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                        <h4 className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                            <Info className="w-3 h-3" />
                            Información Crítica
                        </h4>
                        <ul className="text-xs text-zinc-400 space-y-1.5 list-disc pl-4 font-medium">
                            <li>
                                <span className="text-zinc-200 font-bold">Usuario:</span> Tu ID de acceso único (ej: <code>juan.perez</code>).
                            </li>
                            <li>
                                <span className="text-zinc-200 font-bold">Nombre:</span> Como serás identificado por otros (ej: <code>Juan Pérez</code>).
                            </li>
                        </ul>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Usuario</label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-zinc-500 group-focus-within:text-theme-gold transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-zinc-950/50 border border-white/10 text-white text-sm rounded-xl focus:ring-1 focus:ring-theme-gold focus:border-theme-gold block w-full pl-10 pr-4 p-3.5 placeholder-zinc-700 transition-all outline-none"
                                        placeholder="usuario.id"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Nombre Real</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-zinc-950/50 border border-white/10 text-white text-sm rounded-xl focus:ring-1 focus:ring-theme-gold focus:border-theme-gold block w-full px-4 p-3.5 placeholder-zinc-700 transition-all outline-none"
                                    placeholder="Nombre Apellido"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Contraseña</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-zinc-500 group-focus-within:text-theme-gold transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-zinc-950/50 border border-white/10 text-white text-sm rounded-xl focus:ring-1 focus:ring-theme-gold focus:border-theme-gold block w-full pl-10 pr-12 p-3.5 placeholder-zinc-700 transition-all outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Confirmar</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-zinc-500 group-focus-within:text-theme-gold transition-colors" />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full bg-zinc-900/50 border border-white/10 text-white text-sm rounded-xl focus:ring-1 focus:ring-theme-gold focus:border-theme-gold block w-full pl-10 pr-12 p-3.5 placeholder-zinc-700 transition-all outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-black hover:bg-theme-gold hover:text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-theme-gold/20"
                            >
                                {isLoading ? 'Registrando...' : 'Finalizar Registro'}
                                {!isLoading && <ArrowRight className="w-5 h-5" />}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
