import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Crown, X, Users, Calendar, BookOpen, DollarSign, Activity, Bell, Image, Radio as LucideRadio, Search, AlertTriangle, TrendingUp } from 'lucide-react';
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


interface AdminPanelProps {
    currentUser: User;
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onClose }) => {
    const toast = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [activeTab, setActiveTab] = useState<'users' | 'economy' | 'mentors' | 'curriculum' | 'system' | 'broadcast' | 'updates' | 'landing'>('users');
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
            <div className="bg-white dark:bg-slate-900 rounded-none md:rounded-2xl w-full max-w-7xl h-full md:h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-theme-gold rounded-lg shadow-lg shadow-theme-gold/20">
                            <Crown className="w-6 h-6 text-black" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Panel de Soberanía</h2>
                            <p className="text-sm text-slate-500">Gestión Centralizada del Sistema Magnus</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                {/* Tabs Toolbar */}
                <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                    <div className="flex gap-2 overflow-x-auto pb-2 xl:pb-0 w-full xl:w-auto no-scrollbar mask-linear-fade">
                        <TabButton id="users" icon={Users} label="Usuarios" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="mentors" icon={Calendar} label="Mentores" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="curriculum" icon={BookOpen} label="Pensum" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="economy" icon={DollarSign} label="Economía" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="system" icon={Activity} label="Sistema" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="broadcast" icon={LucideRadio} label="Comms" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="updates" icon={TrendingUp} label="Novedades" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="landing" icon={Image} label="Portada" activeTab={activeTab} setActiveTab={setActiveTab} />
                    </div>

                    {activeTab === 'users' && (
                        <div className="flex w-full xl:w-auto gap-3 animate-in slide-in-from-right-4 duration-300">
                            <div className="relative w-full xl:w-64">
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
                </div>

                {/* Main Content Area */}
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
                    </Suspense>
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

// Helper Component for Tabs
const TabButton = ({ id, icon: Icon, label, activeTab, setActiveTab }: any) => (
    <button
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === id
            ? 'bg-theme-gold text-black shadow-md shadow-theme-gold/20'
            : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
    >
        <Icon size={16} strokeWidth={activeTab === id ? 2.5 : 2} />
        <span>{label}</span>
    </button>
);
