import React, { useState } from 'react';
import { User, UserPreferences } from '../../types/user';
import { authService } from '../../services/auth';
import { X, User as UserIcon, Lock, Crown } from 'lucide-react';
import { PROFILE_ICONS } from '../../constants';

interface SettingsModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onUpdateUser: (updatedUser: User) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ user, isOpen, onClose, onUpdateUser }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'vip'>('profile');
    const [name, setName] = useState(user.name);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [preferences, setPreferences] = useState<UserPreferences>(user.preferences || {});
    // Parse initial avatar from user.avatar if it starts with 'icon:'
    const initialAvatar = user.avatar?.startsWith('icon:') ? user.avatar.replace('icon:', '') : '';
    const [selectedAvatar, setSelectedAvatar] = useState<string>(initialAvatar);

    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const isVip = user.tags?.some(tag => tag.toLowerCase() === 'vip') || user.role === 'admin';

    const handleSave = async () => {
        if (newPassword && newPassword !== confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);
        try {
            const updates: Partial<User> = {
                name,
                preferences
            };

            if (selectedAvatar) {
                updates.avatar = `icon:${selectedAvatar}`;
            }

            if (newPassword) {
                updates.password = newPassword;
            }

            const updated = await authService.updateProfile(user.username, updates);
            onUpdateUser(updated);
            alert('Perfil actualizado correctamente');
            onClose();
        } catch (error) {
            alert('Error al actualizar perfil');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-card-dark w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Configuración de Usuario
                        {isVip && <span className="px-2 py-0.5 rounded-full bg-theme-gold/20 text-theme-gold text-xs uppercase tracking-wider">VIP</span>}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                        <X size={20} className="text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-white/10 px-6">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`py-4 px-2 mr-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Perfil & Seguridad
                    </button>
                    {isVip && (
                        <button
                            onClick={() => setActiveTab('vip')}
                            className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'vip'
                                ? 'border-theme-gold text-theme-gold'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                        >
                            <Crown size={14} /> VIP Zone
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre Visible</label>
                                <div className="relative">
                                    <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Lock size={16} /> Cambiar Contraseña
                                </h3>
                                <div className="space-y-4">
                                    <input
                                        type="password"
                                        placeholder="Nueva Contraseña"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirmar Nueva Contraseña"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'vip' && isVip && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Crown size={16} className="text-theme-gold" />
                                    Avatar Global
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                    Selecciona tu insignia de soberanía. Este avatar te representará en <strong>todo el sistema</strong> (Magnus, Finanzas, Chat).
                                </p>

                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                                    {PROFILE_ICONS.map(({ id, icon: Icon, label }) => {
                                        const isSelected = selectedAvatar === id;
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => setSelectedAvatar(id)}
                                                className={`group p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${isSelected
                                                    ? 'bg-theme-gold text-black shadow-lg shadow-theme-gold/20 scale-105 ring-2 ring-theme-gold ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-slate-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                                                    }`}
                                                title={label}
                                            >
                                                <Icon size={24} />
                                                <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-6 bg-black text-white px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                                                    {label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-6 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};
