import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { MedicalRecord } from '../types';

interface RecordFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: Omit<MedicalRecord, 'id' | 'createdAt'>) => void;
    companyId: string;
    initialData?: MedicalRecord | null;
}

export const RecordFormModal: React.FC<RecordFormModalProps> = ({ isOpen, onClose, onSave, companyId, initialData }) => {
    const [formData, setFormData] = useState({
        patientName: initialData?.patientName || '',
        nap: initialData?.nap || '',
        closeDate: initialData?.closeDate ? new Date(initialData.closeDate.split('/').reverse().join('-')).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        coverage: initialData?.coverage?.toString() || '',
        glossedAmount: initialData?.glossedAmount?.toString() || '0',
        amountToPay: initialData?.amountToPay?.toString() || '',
        note: initialData?.note || ''
    });

    // Update form when initialData changes
    React.useEffect(() => {
        if (initialData) {
            setFormData({
                patientName: initialData.patientName || '',
                nap: initialData.nap || '',
                closeDate: initialData.closeDate ? new Date(initialData.closeDate.split('/').reverse().join('-')).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                coverage: initialData.coverage?.toString() || '',
                glossedAmount: initialData.glossedAmount?.toString() || '0',
                amountToPay: initialData.amountToPay?.toString() || '',
                note: initialData.note || ''
            });
        } else {
            setFormData({
                patientName: '',
                nap: '',
                closeDate: new Date().toISOString().split('T')[0],
                coverage: '',
                glossedAmount: '0',
                amountToPay: '',
                note: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const coverage = parseFloat(formData.coverage) || 0;
        const glossed = parseFloat(formData.glossedAmount) || 0;
        const toPay = parseFloat(formData.amountToPay) || (coverage - glossed);

        onSave({
            companyId,
            patientName: formData.patientName.toUpperCase(),
            nap: formData.nap,
            closeDate: new Date(formData.closeDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            coverage,
            glossedAmount: glossed,
            amountToPay: toPay,
            note: formData.note.toUpperCase()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                    <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-white">{initialData ? 'Editar Expediente' : 'Nuevo Expediente'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Fecha Cierre</label>
                            <input
                                type="date"
                                required
                                value={formData.closeDate}
                                onChange={e => setFormData({ ...formData, closeDate: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-sm focus:border-theme-gold outline-none text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">NAP / Autorización</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: 10090778"
                                value={formData.nap}
                                onChange={e => setFormData({ ...formData, nap: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-sm focus:border-theme-gold outline-none text-slate-900 dark:text-white font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre del Paciente</label>
                        <input
                            type="text"
                            required
                            placeholder="NOMBRE APELLIDO"
                            value={formData.patientName}
                            onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-sm focus:border-theme-gold outline-none text-slate-900 dark:text-white uppercase"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Cobertura</label>
                            <input
                                type="number"
                                required
                                placeholder="0.00"
                                value={formData.coverage}
                                onChange={e => setFormData({ ...formData, coverage: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-sm focus:border-theme-gold outline-none text-slate-900 dark:text-white font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-red-500/80">Monto Glosado</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.glossedAmount}
                                onChange={e => setFormData({ ...formData, glossedAmount: e.target.value })}
                                className="w-full bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg px-4 py-3 text-sm focus:border-red-500 outline-none text-red-600 dark:text-red-400 font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-emerald-500/80">A Pagar</label>
                            <input
                                type="number"
                                placeholder="Auto-calc"
                                value={formData.amountToPay}
                                onChange={e => setFormData({ ...formData, amountToPay: e.target.value })}
                                className="w-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/20 rounded-lg px-4 py-3 text-sm focus:border-emerald-500 outline-none text-emerald-600 dark:text-emerald-400 font-mono font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nota / Observación</label>
                        <input
                            type="text"
                            placeholder="Ej: DIALISIS"
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-sm focus:border-theme-gold outline-none text-slate-900 dark:text-white uppercase"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs tracking-wider transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-3 rounded-lg bg-theme-gold text-white font-bold uppercase text-xs tracking-wider hover:bg-theme-gold/90 shadow-lg shadow-theme-gold/20 flex items-center gap-2 transition-transform hover:scale-105"
                        >
                            <Save size={16} />
                            {initialData ? 'Actualizar' : 'Guardar Expediente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
