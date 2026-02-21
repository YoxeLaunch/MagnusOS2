import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Edit2, PlusCircle, Plus, PieChart, Info } from 'lucide-react';
import { useData } from '../context/DataContext';
import { DailyTransaction } from '../types';
import { TRANSACTION_META } from '../utils/categoryIcons';

interface DailyTransactionModalProps {
    date: Date;
    onClose: () => void;
    initialData?: {
        type?: 'income' | 'expense' | 'investment';
        amount?: number;
        description?: string;
        category?: string;
    } | null;
}

export const DailyTransactionModal: React.FC<DailyTransactionModalProps> = ({ date, onClose, initialData }) => {
    const { addDailyTransaction, updateDailyTransaction, removeDailyTransaction, dailyTransactions } = useData();
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [type, setType] = useState<'income' | 'expense' | 'investment'>(initialData?.type || 'expense');
    const [category, setCategory] = useState(initialData?.category || 'Varios');
    const [editingId, setEditingId] = useState<number | null>(null);

    const dateStr = date.toISOString().split('T')[0];
    const existingTransactions = dailyTransactions.filter(t => t.date === dateStr);
    const hasExisting = existingTransactions.length > 0;

    // Derived state from meta-data
    const currentMeta = TRANSACTION_META[type];
    const currentCategories = currentMeta.categories;

    // Smart Category Detection
    useEffect(() => {
        if (!description || editingId || initialData) return; // Don't auto-categorize if editing or initialData used
        const n = description.toLowerCase();

        // Simple heuristic for auto-categorization based on keywords
        if (type === 'expense') {
            if (n.includes('gas') || n.includes('uber')) setCategory('Transporte');
            else if (n.includes('comida') || n.includes('super')) setCategory('Alimentos');
        } else if (type === 'income') {
            if (n.includes('sueldo')) setCategory('Salario');
        } else if (type === 'investment') {
            if (n.includes('ahorro')) setCategory('Ahorro');
            else if (n.includes('btc') || n.includes('cripto')) setCategory('Cripto');
            else if (n.includes('bolsa')) setCategory('Bolsa');
        }
    }, [description, type, editingId, initialData]);

    const handleEdit = (t: DailyTransaction) => {
        setAmount(t.amount.toString());
        setDescription(t.description);
        setType(t.type);
        setCategory(t.category || 'Varios');
        setEditingId(t.id);
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setType('expense');
        setCategory('Varios');
        setEditingId(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) return;

        const payload = {
            date: dateStr,
            amount: parseFloat(amount),
            description,
            type,
            category
        };

        if (editingId) {
            updateDailyTransaction({ ...payload, id: editingId }, () => {
                resetForm();
                onClose();
            });
        } else {
            addDailyTransaction(payload, () => {
                resetForm();
                onClose();
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full ${hasExisting ? 'max-w-4xl' : 'max-w-lg'} overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row max-h-[90vh]`}>

                {/* LEFT PANEL: LIST (Only if exists) */}
                {hasExisting && (
                    <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-black/20 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200">Registros del Día</h3>
                            <button onClick={resetForm} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 flex items-center gap-1 font-bold">
                                <PlusCircle size={14} /> Nuevo
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {existingTransactions.map(t => {
                                const meta = TRANSACTION_META[t.type];
                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => handleEdit(t)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all group relative ${editingId === t.id
                                            ? 'bg-white dark:bg-gray-800 border-primary ring-1 ring-primary shadow-md'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${meta.bg} ${meta.color}`}>
                                                    <meta.icon size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800 dark:text-white line-clamp-1">{t.description}</p>
                                                    <p className="text-xs text-gray-500">{t.category}</p>
                                                </div>
                                            </div>
                                            <span className={`font-mono font-bold ${meta.color}`}>
                                                {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="absolute right-2 top-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeDailyTransaction(t.id); if (editingId === t.id) resetForm(); }}
                                                className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* RIGHT PANEL: FORM */}
                <div className={`w-full ${hasExisting ? 'md:w-1/2' : 'w-full'} flex flex-col`}>
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                            {editingId ? <Edit2 className="text-primary" size={20} /> : <currentMeta.icon className={currentMeta.color} size={20} />}
                            {editingId ? 'Editar Transacción' : `Registrar ${currentMeta.label}`}
                        </h3>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <X size={20} className="text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                        {/* Type Toggle (3-Way) */}
                        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                            {(Object.keys(TRANSACTION_META) as Array<keyof typeof TRANSACTION_META>).map((key) => {
                                const meta = TRANSACTION_META[key];
                                const isActive = type === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setType(key)}
                                        className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${isActive
                                            ? `bg-white dark:bg-gray-700 shadow-sm ${meta.color}`
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                            }`}
                                    >
                                        <meta.icon size={14} />
                                        {meta.label}
                                    </button>
                                );
                            })}
                        </div>

                        {type === 'investment' && (
                            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 text-xs rounded-lg border border-blue-100 dark:border-blue-800">
                                <Info size={16} className="shrink-0 mt-0.5" />
                                <p>Aporta a tu patrimonio. Esto reduce tu balance disponible pero incrementa tus activos.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monto</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none font-mono text-lg"
                                        placeholder="0.00"
                                        autoFocus={!hasExisting}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Ej: Ahorro, Bitcoin, SP500..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría</label>
                            <div className="grid grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
                                {currentCategories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${category === cat.id
                                            ? `bg-opacity-10 ${currentMeta.bg} ${currentMeta.color} border-current ring-1 ring-current scale-105`
                                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        <cat.icon size={20} className="mb-1" />
                                        <span className="text-[10px] font-bold truncate w-full text-center">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                {editingId ? <Check size={20} /> : <Plus size={20} />}
                                {editingId ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
