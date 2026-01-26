import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';

interface CompanyFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
}

export const CompanyFormModal: React.FC<CompanyFormModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim().toUpperCase());
            onClose();
            setName('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                    <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-white">Nueva ARS / Compañía</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre de la ARS</label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: SEMMA"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-sm focus:border-theme-gold outline-none text-slate-900 dark:text-white uppercase font-bold tracking-wide"
                            autoFocus
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs tracking-wider transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-black font-bold uppercase text-xs tracking-wider hover:opacity-90 shadow-lg flex items-center gap-2"
                        >
                            <PlusCircle size={16} />
                            Crear Compañía
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
