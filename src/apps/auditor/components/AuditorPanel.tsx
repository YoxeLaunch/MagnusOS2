import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RecordsTable } from '../RecordsTable';
import { auditorService } from '../services/auditorService';
import { Company, MedicalRecord, Closure } from '../types';
import { ShieldCheck, Calendar, Filter, Download, Plus, Building2, FilePlus2, FolderPlus } from 'lucide-react';
import { RecordFormModal } from '../components/RecordFormModal';
import { CompanyFormModal } from '../components/CompanyFormModal';

export const AuditorPanel: React.FC = () => {
    const [searchParams] = useSearchParams();
    const view = searchParams.get('view') || 'emergencies'; // Default to emergencies

    const [companies, setCompanies] = useState<Company[]>([]);
    const [activeCompanyId, setActiveCompanyId] = useState<string>('');
    const [closures, setClosures] = useState<Closure[]>([]);
    const [activeClosure, setActiveClosure] = useState<string>(''); // '' = all records
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ count: 0, approvalRate: '100.0' });

    // Modals
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showClosureModal, setShowClosureModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);

    const viewType: 'emergency' | 'record' = view === 'emergencies' ? 'emergency' : 'record';

    const loadData = async () => {
        try {
            const comps = await auditorService.getCompanies();
            setCompanies(comps);

            // Default to first company if none active
            if (!activeCompanyId && comps.length > 0) {
                setActiveCompanyId(comps[0].id);
            }
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const loadClosures = async () => {
            if (activeCompanyId) {
                try {
                    const cls = await auditorService.getClosures(activeCompanyId, viewType);
                    setClosures(cls);
                    // Reset active closure when switching companies or views
                    setActiveClosure('');
                } catch (err) {
                    console.error('Error loading closures:', err);
                }
            }
        };
        loadClosures();
    }, [activeCompanyId, viewType]);

    useEffect(() => {
        const loadRecords = async () => {
            if (activeCompanyId) {
                try {
                    const recs = await auditorService.getRecords(activeCompanyId, activeClosure || undefined);
                    setRecords(recs);
                    const statsData = await auditorService.getStats(activeCompanyId);
                    setStats(statsData);
                } catch (err) {
                    console.error('Error loading records:', err);
                }
            }
        };
        loadRecords();
    }, [activeCompanyId, activeClosure]);

    const handleCreateCompany = async (name: string) => {
        try {
            const newComp = await auditorService.createCompany(name);
            setCompanies([...companies, newComp]);
            setActiveCompanyId(newComp.id);
        } catch (err: any) {
            alert(err.message || 'Error al crear compañía');
        }
    };

    const handleCreateClosure = async () => {
        const name = prompt(`Nombre del cierre (ej: "Enero 2026 - ${view === 'emergencies' ? 'Emergencias' : 'Expedientes'}"):`)?.trim();
        if (name && activeCompanyId) {
            try {
                const newClosure = await auditorService.createClosure(activeCompanyId, name, viewType);
                setClosures([newClosure, ...closures]);
                setActiveClosure(newClosure.id);
            } catch (err: any) {
                alert(err.message || 'Error al crear cierre');
            }
        }
    };

    const handleCreateRecord = async (recordData: Omit<MedicalRecord, 'id' | 'createdAt'>) => {
        try {
            await auditorService.addRecord({
                ...recordData,
                closureId: activeClosure || undefined,
                recordType: viewType
            });
            // Refresh records
            if (activeCompanyId) {
                const recs = await auditorService.getRecords(activeCompanyId, activeClosure || undefined);
                setRecords(recs);
                const statsData = await auditorService.getStats(activeCompanyId);
                setStats(statsData);
            }
        } catch (err: any) {
            alert(err.message || 'Error al crear expediente');
        }
    };

    const handleUpdateRecord = async (recordData: Omit<MedicalRecord, 'id' | 'createdAt'>) => {
        if (!editingRecord) return;
        try {
            await auditorService.updateRecord(editingRecord.id, recordData);
            // Refresh records
            if (activeCompanyId) {
                const recs = await auditorService.getRecords(activeCompanyId, activeClosure || undefined);
                setRecords(recs);
            }
            setEditingRecord(null);
        } catch (err: any) {
            alert(err.message || 'Error al actualizar expediente');
        }
    };

    const handleEdit = (record: MedicalRecord) => {
        setEditingRecord(record);
        setShowRecordModal(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este expediente?')) {
            try {
                await auditorService.deleteRecord(id);
                const recs = await auditorService.getRecords(activeCompanyId, activeClosure || undefined);
                setRecords(recs);
            } catch (err: any) {
                alert(err.message || 'Error al eliminar');
            }
        }
    };

    const filteredRecords = records.filter(r =>
        r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.nap.includes(searchTerm)
    );

    const activeCompany = companies.find(c => c.id === activeCompanyId);

    return (
        <div className="p-6 lg:p-12 max-w-[1600px] mx-auto space-y-8 animate-fade-in pb-24">
            {/* Header */}
            <header className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-widest uppercase flex items-center gap-3">
                            <ShieldCheck className={`w-6 h-6 sm:w-8 sm:h-8 ${view === 'emergencies' ? 'text-red-500' : 'text-emerald-500'}`} />
                            {view === 'emergencies' ? 'Emergencias' : 'Expedientes'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-mono text-xs mt-2 uppercase tracking-wider flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${view === 'emergencies' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                            {activeCompany?.name || 'Sin ARS Seleccionada'}
                        </p>
                    </div>

                    {/* Action Buttons - Mobile Optimized */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleCreateClosure}
                            className={`hidden sm:flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm ${view === 'emergencies'
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                }`}
                        >
                            <FolderPlus className="w-4 h-4" />
                            <span className="hidden md:inline">Nuevo Cierre</span>
                        </button>

                        <button
                            onClick={() => {
                                setEditingRecord(null);
                                setShowRecordModal(true);
                            }}
                            className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg ${view === 'emergencies'
                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
                                : 'bg-theme-gold hover:bg-theme-gold/90 text-white shadow-theme-gold/20'
                                }`}
                        >
                            <FilePlus2 className="w-4 h-4" />
                            Nuevo
                        </button>
                    </div>
                </div>

                {/* Companies Tabs - Below on mobile */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg flex-wrap gap-1">
                        {companies.map(company => (
                            <button
                                key={company.id}
                                onClick={() => setActiveCompanyId(company.id)}
                                className={`
                                    px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md transition-all
                                    ${activeCompanyId === company.id
                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }
                                `}
                            >
                                {company.name}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowCompanyModal(true)}
                            className="px-2 py-1.5 text-slate-400 hover:text-theme-gold transition-colors"
                            title="Nueva Compañía"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {/* Mobile: Nuevo Cierre button */}
                    <button
                        onClick={handleCreateClosure}
                        className={`sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${view === 'emergencies'
                            ? 'bg-red-500 text-white'
                            : 'bg-emerald-500 text-white'
                            }`}
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                        Cierre
                    </button>
                </div>
            </header>

            {/* Closure Selector */}
            {closures.length > 0 && (
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Cierre Activo:
                    </label>
                    <select
                        value={activeClosure}
                        onChange={(e) => setActiveClosure(e.target.value)}
                        className="flex-1 max-w-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">-- Todos los Registros --</option>
                        {closures.map(closure => (
                            <option key={closure.id} value={closure.id}>
                                {closure.name} ({closure.status === 'open' ? 'Abierto' : 'Cerrado'})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-theme-gold/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Building2 className="w-24 h-24 text-theme-gold" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">ARS Seleccionada</p>
                    <h3 className="text-4xl font-serif text-slate-900 dark:text-white truncate pr-8">{activeCompany?.name || '---'}</h3>
                    <div className="mt-4 text-xs text-theme-gold font-mono flex items-center gap-1">
                        Activa
                    </div>
                </div>

                <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-theme-gold/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Filter className="w-24 h-24 text-blue-500" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Registros</p>
                    <h3 className="text-4xl font-serif text-slate-900 dark:text-white">{stats.count}</h3>
                    <div className="mt-4 text-xs text-slate-400 font-mono">
                        {activeClosure ? 'En cierre actual' : 'Todos'}
                    </div>
                </div>

                <div className="bg-white dark:bg-theme-card border border-slate-200 dark:border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-theme-gold/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShieldCheck className="w-24 h-24 text-emerald-500" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Tasa Aprobación</p>
                    <h3 className="text-4xl font-serif text-slate-900 dark:text-white">{stats.approvalRate}%</h3>
                    <div className="mt-4 text-xs text-emerald-500 font-mono">
                        Estimada
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por paciente o NAP..."
                        className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:border-theme-gold transition-colors text-slate-700 dark:text-slate-200 placeholder-slate-400"
                    />
                </div>

                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300">
                        <Calendar className="w-4 h-4" />
                        {new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                    </button>
                    <button className="p-2 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500" title="Exportar">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
            {records.length > 0 ? (
                <RecordsTable
                    data={filteredRecords}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            ) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/10">
                    <p className="text-slate-400 mb-4">No hay registros en {activeCompany?.name}.</p>
                    <button
                        onClick={() => setShowRecordModal(true)}
                        className="px-6 py-2 bg-slate-200 dark:bg-white/10 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-theme-gold hover:text-white transition-colors"
                    >
                        Crear Primer Registro
                    </button>
                </div>
            )}

            {/* Modals */}
            <RecordFormModal
                isOpen={showRecordModal}
                onClose={() => {
                    setShowRecordModal(false);
                    setEditingRecord(null);
                }}
                onSave={editingRecord ? handleUpdateRecord : handleCreateRecord}
                companyId={activeCompanyId}
                initialData={editingRecord}
            />

            <CompanyFormModal
                isOpen={showCompanyModal}
                onClose={() => setShowCompanyModal(false)}
                onSave={handleCreateCompany}
            />
        </div>
    );
};
