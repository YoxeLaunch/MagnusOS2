import React from 'react';
import { Crown, Trash2, Search, Key, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../../../../../shared/context/ToastContext';
import { User, UserRole } from '../../../types';
import { apiFetch } from '../../../../../shared/utils/apiFetch';
import { UserAvatar } from '../../../../../shared/components/UserAvatar';
import { exportToCSV } from '../../../../../shared/utils/csvExport';

interface UsersTabProps {
    users: User[];
    currentUser: User;
    loading: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    debouncedSearchTerm: string;
    onToggleVIP: (user: User) => void;
    onDelete: (user: User) => void;
}

const UserRow = React.memo(({ user, currentUser, onToggleVIP, onDelete }: {
    user: User,
    currentUser: User,
    onToggleVIP: (u: User) => void,
    onDelete: (u: User) => void
}) => {
    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5 hover:border-theme-gold/50 transition-all hover:shadow-sm group">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex-shrink-0">
                    <UserAvatar user={user} className="w-10 h-10" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</h3>
                        {user.role === 'admin' && <Crown className="w-3 h-3 text-theme-gold" fill="currentColor" />}
                        {user.tags?.includes('VIP') && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-theme-gold text-black rounded-full">VIP</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">@{user.username}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {user.username !== currentUser.username && user.role !== 'admin' && (
                    <>
                        <button
                            onClick={() => onToggleVIP(user)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${user.tags?.includes('VIP')
                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'
                                    : 'bg-theme-gold/10 text-theme-gold hover:bg-theme-gold hover:text-black'
                                }`}
                        >
                            {user.tags?.includes('VIP') ? 'Quitar' : 'VIP'}
                        </button>

                        <button
                            onClick={() => onDelete(user)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar Usuario"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});

export const UsersTab: React.FC<UsersTabProps> = ({
    users,
    currentUser,
    loading,
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    onToggleVIP,
    onDelete
}) => {
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );

    const stats = {
        total: users.length,
        vip: users.filter(u => u.tags?.includes('VIP')).length,
        admins: users.filter(u => u.role === 'admin').length,
        active: users.length // Placeholder for active users logic if available
    };

    const [passwordResetUser, setPasswordResetUser] = React.useState<User | null>(null);
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [isResetting, setIsResetting] = React.useState(false);
    const toast = useToast();

    const handlePasswordReset = async () => {
        if (!passwordResetUser || !newPassword) return;
        if (newPassword !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsResetting(true);
        try {
            const response = await apiFetch(`/api/users/${passwordResetUser.username}/password`, {
                method: 'POST',
                body: JSON.stringify({ password: newPassword })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar contraseña');
            }

            toast.success(`Contraseña actualizada para ${passwordResetUser.username}`);
            setPasswordResetUser(null);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('[PASSWORD RESET] Exception:', error);
            toast.error('Error al actualizar la contraseña: ' + (error as Error).message);
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Usuarios</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="text-theme-gold text-xs font-bold uppercase tracking-wider mb-1">VIPs</div>
                    <div className="text-2xl font-bold text-theme-gold">{stats.vip}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="text-blue-500 text-xs font-bold uppercase tracking-wider mb-1">Admins</div>
                    <div className="text-2xl font-bold text-blue-500">{stats.admins}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="text-green-500 text-xs font-bold uppercase tracking-wider mb-1">Activos</div>
                    <div className="text-2xl font-bold text-green-500">{stats.active}</div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o @usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all text-sm"
                    />
                </div>
                <button
                    onClick={() => exportToCSV(users, 'usuarios-magnus')}
                    className="w-full md:w-auto px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-2"
                >
                    <Search size={16} className="opacity-50" />
                    Exportar CSV
                </button>
            </div>

            {/* User Grid */}
            <div className="flex-1 overflow-y-auto min-h-[400px]">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="w-8 h-8 border-4 border-theme-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredUsers.map(user => (
                            <div key={user.username} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-theme-gold/50 transition-all hover:shadow-md group flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={user} className="w-12 h-12" />
                                        <div>
                                            <div className="flex items-center gap-1">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1" title={user.name}>{user.name}</h3>
                                                {user.role === 'admin' && <Crown className="w-3 h-3 text-theme-gold shrink-0" fill="currentColor" />}
                                            </div>
                                            <p className="text-xs text-slate-500">@{user.username}</p>
                                        </div>
                                    </div>
                                    {user.tags?.includes('VIP') && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-theme-gold text-black rounded-full shadow-sm">VIP</span>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2 mt-auto">
                                    {user.username !== currentUser.username && user.role !== 'admin' && (
                                        <>
                                            <button
                                                onClick={() => onToggleVIP(user)}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${user.tags?.includes('VIP')
                                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'
                                                    : 'bg-theme-gold/10 text-theme-gold hover:bg-theme-gold hover:text-black'
                                                    }`}
                                            >
                                                {user.tags?.includes('VIP') ? 'Quitar VIP' : 'Hacer VIP'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setPasswordResetUser(user);
                                                    setNewPassword('');
                                                    setConfirmPassword('');
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-theme-gold hover:bg-theme-gold/10 rounded-lg transition-colors"
                                                title="Cambiar Contraseña"
                                            >
                                                <Key size={16} />
                                            </button>

                                            <button
                                                onClick={() => onDelete(user)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Eliminar Usuario"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {filteredUsers.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400 gap-4">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                    <Search size={32} className="opacity-50" />
                                </div>
                                <p>No se encontraron usuarios</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Password Reset Modal */}
            {passwordResetUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Key className="w-5 h-5 text-theme-gold" />
                                Cambiar Contraseña
                            </h3>
                            <button
                                onClick={() => setPasswordResetUser(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Usuario
                                </label>
                                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-mono">
                                    {passwordResetUser.username}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Nueva Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-theme-gold text-sm"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Confirmar Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-theme-gold text-sm"
                                    placeholder="Repite la contraseña"
                                />
                            </div>

                            <button
                                onClick={handlePasswordReset}
                                disabled={isResetting || !newPassword || newPassword !== confirmPassword}
                                className="w-full mt-4 py-2.5 bg-theme-gold hover:bg-theme-gold/90 text-black font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isResetting ? (
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Key size={16} />
                                        <span>Actualizar Contraseña</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
