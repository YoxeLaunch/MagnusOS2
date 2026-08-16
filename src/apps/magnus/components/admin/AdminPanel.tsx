import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Crown, X, Users, Calendar, BookOpen, DollarSign, Activity, Bell, Image, Radio as LucideRadio, Search, AlertTriangle, TrendingUp, HardDrive } from 'lucide-react';
import { useToast } from '../../../../shared/context/ToastContext';
import { useDebounce } from '../../../../shared/hooks/useDebounce';
import { User } from '../../types';
import { authService } from '../../services/auth';
import { SettingsModal } from '../../../../shared/components/home/SettingsModal';
import { SystemMonitor } from '../../../../shared/components/admin/SystemMonitor';
import { exportToCSV } from '../../../../shared/utils/csvExport';
import { apiFetch } from '../../../../shared/utils/apiFetch';

// Lazy-loaded tab components
const LandingTab = lazy(() => import('./tabs/LandingTab').then(module => ({ default: module.LandingTab })));
const UsersTab = lazy(() => import('./tabs/UsersTab').then(module => ({ default: module.UsersTab })));
const MentorsTab = lazy(() => import('./tabs/MentorsTab').then(module => ({ default: module.MentorsTab })));
const EconomyTab = lazy(() => import('./tabs/EconomyTab').then(module => ({ default: module.EconomyTab })));
const CurriculumTab = lazy(() => import('./tabs/CurriculumTab').then(module => ({ default: module.CurriculumTab })));
const BroadcastTab = lazy(() => import('./tabs/BroadcastTab').then(module => ({ default: module.BroadcastTab })));
const UpdatesTab = lazy(() => import('./tabs/UpdatesTab').then(module => ({ default: module.UpdatesTab })));
const BackupTab = lazy(() => import('./tabs/BackupTab').then(module => ({ default: module.BackupTab })));


interface AdminPanelProps {
    currentUser: User;
    onClose: () => void;
}

type TabId = 'users' | 'economy' | 'mentors' | 'curriculum' | 'system' | 'broadcast' | 'updates' | 'landing' | 'backup';

// Menú del panel: mismas 8 secciones de siempre, agrupadas como panel de administración
const NAV_GROUPS: { group: string; items: { id: TabId; icon: any; label: string; description: string }[] }[] = [
    {
        group: 'Comunidad',
        items: [
            { id: 'users', icon: Users, label: 'Usuarios', description: 'Gestión de cuentas, roles y privilegios VIP' },
            { id: 'mentors', icon: Calendar, label: 'Mentores', description: 'Calendario y asignación de mentores del año' },
            { id: 'curriculum', icon: BookOpen, label: 'Pensum', description: 'Currículum, módulos y misiones del sistema' },
        ]
    },
    {
        group: 'Operación',
        items: [
            { id: 'economy', icon: DollarSign, label: 'Economía', description: 'Indicadores y configuración económica' },
            { id: 'system', icon: Activity, label: 'Sistema', description: 'Monitor de recursos y estado del servidor' },
            { id: 'backup', icon: HardDrive, label: 'Backups', description: 'Copias de seguridad de la base de datos' },
        ]
    },
    {
        group: 'Comunicación',
        items: [
            { id: 'broadcast', icon: LucideRadio, label: 'Comms', description: 'Transmisiones y mensajes globales' },
            { id: 'updates', icon: TrendingUp, label: 'Novedades', description: 'Changelog y anuncios del sistema' },
            { id: 'landing', icon: Image, label: 'Portada', description: 'Contenido de la página de bienvenida' },
        ]
    }
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onClose }) => {
    const toast = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>('users');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

    // Mentors State (Lifted or managed inside? Ideally lifted if shared, but for now MentorsTab manages a lot or we pass it down)
    // In previous code, AdminPanel managed mentors to save them. MentorsTab needs props.
    // I will keep the Mentors state here as it was before to avoid breaking MentorsTab which expects props.
    const [mentors, setMentors] = useState<any[]>([]);
    const [availableMentors, setAvailableMentors] = useState([
        { name: "Brian Tracy", role: "Ventas, Éxito", image: "/images/mentors/brian.jpg" },
        { name: "Robert Greene", role: "Estrategia, Poder", image: "/images/mentors/robert.jpg" },
        { name: "Melinka Barrera", role: "Liderazgo, Finanzas Personales", image: "/images/mentors/melinka.jpg" },
        { name: "Victoria Shapar", role: "Neurociencia, Hábitos", image: "/images/mentors/victoria.jpg" },
        { name: "Irene Albacete", role: "Marca Personal, Marketing", image: "/images/mentors/irene.jpg" },
        { name: "Pilar Sousa", role: "Comunicación, Oratoria", image: "/images/mentors/pilar.jpg" },
    ]);

    const isSoberano = currentUser?.username.toLowerCase() === 'soberano';
    const activeItem = ALL_NAV_ITEMS.find(item => item.id === activeTab) || ALL_NAV_ITEMS[0];

    useEffect(() => {
        loadUsers();
        loadMentors();
    }, [currentUser]);

    const loadUsers = async () => {
        try {
            const data = await authService.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error loading users', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMentors = async () => {
        try {
            const res = await apiFetch(`/api/mentors`);
            const data = await res.json();
            const sortedMentors = sortMentorsByDate(data);
            setMentors(sortedMentors);
        } catch (error) {
            console.error('Error loading mentors', error);
        }
    };

    const sortMentorsByDate = (mentorsList: any[]) => {
        return [...mentorsList].sort((a, b) => {
            const dateA = new Date(a.startDate || '9999-12-31');
            const dateB = new Date(b.startDate || '9999-12-31');
            return dateA.getTime() - dateB.getTime();
        });
    };

    const saveMentors = async () => {
        if (!isSoberano) return;
        try {
            const sortedMentors = sortMentorsByDate(mentors);
            const res = await apiFetch(`/api/mentors`, {
                method: 'POST',
                body: JSON.stringify(sortedMentors)
            });
            if (res.ok) {
                setMentors(sortedMentors);
                toast.success('Mentores guardados correctamente');
            }
        } catch (error) {
            console.error('Error saving mentors', error);
        }
    };

    const handleToggleVIP = async (user: User) => {
        const isVIP = user.tags?.includes('VIP');
        const action = isVIP ? 'remove' : 'add';

        try {
            await authService.updateUserTag(user.username, 'VIP', action);
            setUsers(users.map(u => {
                if (u.username === user.username) {
                    const newTags = isVIP
                        ? (u.tags || []).filter(t => t !== 'VIP')
                        : [...(u.tags || []), 'VIP'];
                    return { ...u, tags: newTags };
                }
                return u;
            }));
        } catch (e) {
            console.error("Failed to toggle tag", e);
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteConfirmUser) return;
        try {
            const response = await apiFetch(`/api/users/${deleteConfirmUser.username}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Error al eliminar');
            setUsers(users.filter(u => u.username !== deleteConfirmUser.username));
            setDeleteConfirmUser(null);
            toast.success(`Usuario ${deleteConfirmUser.username} eliminado correctamente.`);
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        }
    };

    const LoadingSpinner = () => (
        <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-theme-gold border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-none md:rounded-2xl w-full max-w-7xl h-full md:h-[92vh] flex shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">

                {/* ==================== SIDEBAR ==================== */}
                <aside className="w-16 lg:w-64 flex-shrink-0 bg-slate-950 border-r border-white/5 flex flex-col">
                    {/* Brand */}
                    <div className="flex items-center gap-3 p-4 lg:p-5 border-b border-white/5">
                        <div className="p-2 bg-theme-gold rounded-lg shadow-lg shadow-theme-gold/20 flex-shrink-0">
                            <Crown className="w-5 h-5 text-black" />
                        </div>
                        <div className="hidden lg:block min-w-0">
                            <h2 className="text-sm font-bold font-serif text-white truncate">Panel de Soberanía</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">Sistema Magnus</p>
                        </div>
                    </div>

                    {/* Nav Groups */}
                    <nav className="flex-1 overflow-y-auto py-4 space-y-5 no-scrollbar">
                        {NAV_GROUPS.map(group => (
                            <div key={group.group}>
                                <p className="hidden lg:block px-5 mb-2 text-[9px] font-bold text-slate-600 uppercase tracking-[0.25em]">
                                    {group.group}
                                </p>
                                <div className="space-y-0.5 px-2 lg:px-3">
                                    {group.items.map(item => {
                                        const isActive = activeTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveTab(item.id)}
                                                title={item.label}
                                                className={`w-full flex items-center gap-3 px-2.5 lg:px-3 py-2.5 rounded-lg text-sm transition-all justify-center lg:justify-start ${isActive
                                                    ? 'bg-theme-gold/10 text-theme-gold border border-theme-gold/20 font-bold'
                                                    : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'
                                                    }`}
                                            >
                                                <item.icon size={17} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                                                <span className="hidden lg:inline truncate">{item.label}</span>
                                                {isActive && <span className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-theme-gold" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* User footer */}
                    <div className="p-3 lg:p-4 border-t border-white/5 flex items-center gap-3 justify-center lg:justify-start">
                        <div className="w-8 h-8 rounded-full bg-theme-gold/15 border border-theme-gold/30 text-theme-gold flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase">
                            {currentUser.name?.charAt(0) || 'S'}
                        </div>
                        <div className="hidden lg:block min-w-0">
                            <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                            <p className="text-[10px] text-theme-gold uppercase tracking-wider">Soberano</p>
                        </div>
                    </div>
                </aside>

                {/* ==================== MAIN ==================== */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* Section Header */}
                    <header className="flex items-center justify-between gap-4 px-5 lg:px-8 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-theme-gold/10 text-theme-gold flex-shrink-0">
                                <activeItem.icon size={18} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base lg:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                                    {activeItem.label}
                                </h3>
                                <p className="text-[11px] text-slate-500 truncate hidden sm:block">{activeItem.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Toolbar contextual de Usuarios */}
                            {activeTab === 'users' && (
                                <div className="hidden md:flex gap-3 animate-in slide-in-from-right-4 duration-300">
                                    <div className="relative w-48 xl:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar usuario..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={() => exportToCSV(users, 'usuarios-magnus')}
                                        className="px-4 py-2 bg-theme-gold/10 text-theme-gold hover:bg-theme-gold hover:text-black border border-theme-gold/20 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
                                    >
                                        Exportar
                                    </button>
                                </div>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                    </header>

                    {/* Búsqueda de usuarios en móvil (el header la oculta) */}
                    {activeTab === 'users' && (
                        <div className="md:hidden px-5 pt-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar usuario..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 focus:outline-none focus:border-theme-gold focus:ring-1 focus:ring-theme-gold transition-all text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-black/20">
                        <Suspense fallback={<LoadingSpinner />}>
                            {activeTab === 'users' && (
                                <div className="p-4">
                                    <UsersTab
                                        users={users}
                                        currentUser={currentUser}
                                        loading={loading}
                                        searchTerm={searchTerm}
                                        setSearchTerm={setSearchTerm}
                                        debouncedSearchTerm={debouncedSearchTerm}
                                        onToggleVIP={handleToggleVIP}
                                        onDelete={setDeleteConfirmUser}
                                    />
                                </div>
                            )}

                            {activeTab === 'mentors' && (
                                <div className="p-4 h-full">
                                    <MentorsTab
                                        mentors={mentors}
                                        setMentors={setMentors}
                                        availableMentors={availableMentors}
                                        saveMentors={saveMentors}
                                    />
                                </div>
                            )}

                            {activeTab === 'landing' && (
                                <div className="p-6 h-full">
                                    <LandingTab loading={loading} setLoading={setLoading} />
                                </div>
                            )}

                            {activeTab === 'economy' && (
                                <EconomyTab currentUser={currentUser} isSoberano={isSoberano} />
                            )}

                            {activeTab === 'curriculum' && (
                                <div className="p-6 h-full">
                                    <CurriculumTab isSoberano={isSoberano} />
                                </div>
                            )}

                            {activeTab === 'broadcast' && (
                                <BroadcastTab />
                            )}

                            {activeTab === 'updates' && (
                                <div className="p-6 h-full">
                                    <UpdatesTab />
                                </div>
                            )}

                            {activeTab === 'system' && (
                                <SystemMonitor />
                            )}

                            {activeTab === 'backup' && (
                                <BackupTab />
                            )}
                        </Suspense>
                    </div>
                </div>

                {/* Modals */}
                {editingUser && (
                    <SettingsModal
                        user={editingUser}
                        isOpen={true}
                        onClose={() => setEditingUser(null)}
                        onUpdateUser={(updatedUser) => {
                            setUsers(users.map(u => u.username === updatedUser.username ? updatedUser : u));
                            setEditingUser(null);
                        }}
                    />
                )}

                {deleteConfirmUser && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-red-200 dark:border-red-900/30">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">
                                ¿Eliminar Usuario?
                            </h3>
                            <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
                                Estás a punto de eliminar a <span className="font-bold text-slate-900 dark:text-white">{deleteConfirmUser.name}</span>. <br />
                                <span className="font-bold text-red-500">Esta acción es irreversible.</span>
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirmUser(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-lg shadow-red-600/20 transition-all"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
