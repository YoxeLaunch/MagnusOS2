import React, { useState } from 'react';
import { Save, Trash2, UserPlus, Calendar, X, Check, Search, ChevronRight } from 'lucide-react';
import { DatePicker } from '../../../../../shared/components/ui/DatePicker';
import { useToast } from '../../../../../shared/context/ToastContext';

interface Mentor {
    id?: string;
    name: string;
    role: string;
    image: string;
    startDate: string;
    endDate: string;
    quote?: string;
}

interface MentorsTabProps {
    mentors: Mentor[];
    setMentors: (mentors: Mentor[]) => void;
    availableMentors: any[];
    saveMentors: () => void;
}

export const MentorsTab: React.FC<MentorsTabProps> = ({
    mentors,
    setMentors,
    availableMentors,
    saveMentors
}) => {
    const toast = useToast();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
    const [searchTerm, setSearchTerm] = useState('');

    const [newMentor, setNewMentor] = useState({
        name: '',
        role: '',
        image: '',
        quote: ''
    });

    const handleAddPreset = (mentor: any) => {
        const newM = {
            ...mentor,
            id: Math.random().toString(36).substr(2, 9),
            startDate: '2026-01-01',
            endDate: '2026-01-31'
        };
        setMentors([...mentors, newM]);
        toast.success("Mentor agregado a la agenda");
        setIsAddModalOpen(false);
    };

    const handleAddCustom = () => {
        if (!newMentor.name) return toast.warning("Nombre requerido");

        const newM = {
            id: Math.random().toString(36).substr(2, 9),
            name: newMentor.name,
            role: newMentor.role,
            image: newMentor.image || '/images/avatar-placeholder.png',
            startDate: '2026-01-01',
            endDate: '2026-01-31',
            quote: newMentor.quote
        };
        setMentors([...mentors, newM]);
        setNewMentor({ name: '', role: '', image: '', quote: '' });
        toast.success("Mentor personalizado creado");
        setIsAddModalOpen(false);
    };

    const handleDelete = (index: number) => {
        const updated = mentors.filter((_, i) => i !== index);
        setMentors(updated);
        toast.info("Mentor eliminado");
    };

    const filteredPresets = availableMentors.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-gold/10 rounded-lg text-theme-gold">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Agenda de Mentores</h3>
                        <p className="text-xs text-slate-500">Administra los mentores activos este mes</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-lg hover:bg-theme-gold hover:text-black transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
                    >
                        <UserPlus size={18} />
                        Añadir Mentor
                    </button>
                    <button
                        onClick={saveMentors}
                        className="px-4 py-2.5 bg-theme-gold text-black font-bold rounded-lg shadow-sm hover:bg-yellow-500 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Save size={18} />
                        Guardar
                    </button>
                </div>
            </div>

            {/* Mentors Grid */}
            <div className="flex-1 overflow-y-auto">
                {mentors.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <Calendar size={32} strokeWidth={1.5} />
                        </div>
                        <p>No hay mentores agendados para este periodo</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="text-theme-gold hover:underline text-sm font-bold"
                        >
                            Comenzar agregando uno
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {mentors.map((mentor, index) => (
                            <div key={mentor.id || index} className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md hover:border-theme-gold/30 transition-all flex flex-col overflow-hidden">

                                {/* Header / ID Card */}
                                <div className="p-5 flex items-start gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-white/10 ring-2 ring-transparent group-hover:ring-theme-gold/20 transition-all">
                                            <img
                                                src={mentor.image}
                                                className="w-full h-full object-cover"
                                                alt={mentor.name}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + mentor.name + '&background=random';
                                                }}
                                            />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white dark:border-slate-800">
                                            #{index + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-lg group-hover:text-theme-gold transition-colors">{mentor.name}</h4>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate">{mentor.role}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(index)}
                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {/* Schedule Section */}
                                <div className="mt-auto bg-slate-50/50 dark:bg-slate-900/30 p-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-px bg-slate-200 dark:bg-white/10 flex-1"></div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Programación</span>
                                        <div className="h-px bg-slate-200 dark:bg-white/10 flex-1"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <DatePicker
                                            label="INICIO"
                                            value={mentor.startDate}
                                            onChange={(date) => {
                                                const updated = [...mentors];
                                                updated[index].startDate = date;
                                                setMentors(updated);
                                            }}
                                        />
                                        <DatePicker
                                            label="FIN"
                                            value={mentor.endDate}
                                            onChange={(date) => {
                                                const updated = [...mentors];
                                                updated[index].endDate = date;
                                                setMentors(updated);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Mentor Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Añadir Mentor</h3>
                                <p className="text-xs text-slate-500">Selecciona de la lista o crea uno nuevo</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-white/10">
                            <button
                                onClick={() => setActiveTab('preset')}
                                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'preset'
                                        ? 'border-theme-gold text-theme-gold bg-theme-gold/5'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Predefinidos
                            </button>
                            <button
                                onClick={() => setActiveTab('custom')}
                                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'custom'
                                        ? 'border-theme-gold text-theme-gold bg-theme-gold/5'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Personalizado
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 overflow-y-auto flex-1">
                            {activeTab === 'preset' ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar mentor..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm border-none focus:ring-1 focus:ring-theme-gold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        {filteredPresets.map((m) => (
                                            <button
                                                key={m.name}
                                                onClick={() => handleAddPreset(m)}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all text-left group"
                                            >
                                                <img src={m.image} alt={m.name} className="w-10 h-10 rounded-lg object-cover bg-slate-200" />
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-900 dark:text-white text-sm">{m.name}</div>
                                                    <div className="text-xs text-slate-500">{m.role}</div>
                                                </div>
                                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-theme-gold group-hover:bg-theme-gold/10 transition-colors">
                                                    <ChevronRight size={16} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre</label>
                                            <input
                                                type="text"
                                                value={newMentor.name}
                                                onChange={(e) => setNewMentor({ ...newMentor, name: e.target.value })}
                                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-theme-gold"
                                                placeholder="Ej: John Doe"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Rol</label>
                                            <input
                                                type="text"
                                                value={newMentor.role}
                                                onChange={(e) => setNewMentor({ ...newMentor, role: e.target.value })}
                                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-theme-gold"
                                                placeholder="Ej: Financial Expert"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">URL Foto</label>
                                            <input
                                                type="text"
                                                value={newMentor.image}
                                                onChange={(e) => setNewMentor({ ...newMentor, image: e.target.value })}
                                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-theme-gold"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Frase / Quote</label>
                                            <textarea
                                                value={newMentor.quote}
                                                onChange={(e) => setNewMentor({ ...newMentor, quote: e.target.value })}
                                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-theme-gold resize-none h-24"
                                                placeholder="Una frase inspiradora..."
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddCustom}
                                        className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:bg-theme-gold hover:text-black transition-colors shadow-lg"
                                    >
                                        Crear Mentor
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
