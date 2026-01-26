import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency } from '../utils/calculations';
import { Transaction } from '../types';
import {
    PiggyBank,
    Plus,
    Edit2,
    Trash2,
    TrendingUp,
    Calendar,
    DollarSign,
    Save,
    X,
    Building2,
    Landmark,
    Coins,
    Target
} from 'lucide-react';

// Categorías de inversión
const INVESTMENT_CATEGORIES = [
    { id: 'ahorro', label: 'Ahorro', icon: PiggyBank },
    { id: 'acciones', label: 'Acciones/Fondos', icon: TrendingUp },
    { id: 'bienes_raices', label: 'Bienes Raíces', icon: Building2 },
    { id: 'crypto', label: 'Criptomonedas', icon: Coins },
    { id: 'banco', label: 'Depósito Banco', icon: Landmark },
    { id: 'otro', label: 'Otro', icon: Target },
];

export const Investments: React.FC = () => {
    const { data, addTransaction, removeTransaction, updateTransaction } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        category: 'ahorro',
        frequency: 'Mensual' as Transaction['frequency'],
        currency: 'DOP' as Transaction['currency'],
        date: new Date().toISOString().split('T')[0],
    });

    const totalInvested = data.investments.reduce((sum, inv) => sum + inv.amount, 0);

    const resetForm = () => {
        setFormData({
            name: '',
            amount: '',
            category: 'ahorro',
            frequency: 'Mensual',
            currency: 'DOP',
            date: new Date().toISOString().split('T')[0],
        });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const transaction: Transaction = {
            id: editingId || `inv-${Date.now()}`,
            name: formData.name,
            amount: parseFloat(formData.amount),
            category: formData.category,
            frequency: formData.frequency,
            currency: formData.currency,
            date: formData.date,
            type: 'investment',
        };

        if (editingId) {
            updateTransaction(transaction);
        } else {
            addTransaction(transaction);
        }

        resetForm();
    };

    const handleEdit = (inv: Transaction) => {
        setEditingId(inv.id);
        setFormData({
            name: inv.name,
            amount: inv.amount.toString(),
            category: inv.category,
            frequency: inv.frequency,
            currency: inv.currency,
            date: inv.date || new Date().toISOString().split('T')[0],
        });
        setIsAdding(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta inversión?')) {
            removeTransaction(id);
        }
    };

    const getCategoryIcon = (categoryId: string) => {
        const cat = INVESTMENT_CATEGORIES.find(c => c.id === categoryId);
        return cat ? cat.icon : PiggyBank;
    };

    const getCategoryLabel = (categoryId: string) => {
        const cat = INVESTMENT_CATEGORIES.find(c => c.id === categoryId);
        return cat ? cat.label : categoryId;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-8">
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 sm:text-3xl sm:truncate text-gray-900 dark:text-white flex items-center gap-3">
                        <PiggyBank className="text-emerald-500" /> Inversiones
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Gestiona tu dinero destinado a inversiones y ahorro a largo plazo.
                    </p>
                </div>
                <div className="mt-4 md:mt-0">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        <Plus size={20} /> Nueva Inversión
                    </button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-white opacity-10 blur-xl"></div>
                <div className="relative z-10">
                    <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider mb-1">Total Invertido</p>
                    <h3 className="text-4xl font-bold tracking-tight">{formatCurrency(totalInvested)}</h3>
                    <p className="text-emerald-200 text-sm mt-2">{data.investments.length} inversiones activas</p>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-white/10">
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <PiggyBank className="text-emerald-500" />
                                {editingId ? 'Editar Inversión' : 'Nueva Inversión'}
                            </h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    placeholder="Ej: Fondo de emergencia, CDT..."
                                />
                            </div>

                            {/* Monto y Moneda */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as Transaction['currency'] }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    >
                                        <option value="DOP">DOP</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>

                            {/* Categoría */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoría</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {INVESTMENT_CATEGORIES.map(cat => {
                                        const Icon = cat.icon;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                                                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${formData.category === cat.id
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                                                    }`}
                                            >
                                                <Icon size={20} />
                                                <span className="text-xs font-medium">{cat.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Frecuencia y Fecha */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frecuencia</label>
                                    <select
                                        value={formData.frequency}
                                        onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as Transaction['frequency'] }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    >
                                        <option value="Mensual">Mensual</option>
                                        <option value="Trimestral">Trimestral</option>
                                        <option value="Anual">Anual</option>
                                        <option value="Fijo">Único</option>
                                        <option value="Variable">Variable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                    <div className="relative">
                                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save size={18} /> {editingId ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Investments List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mis Inversiones</h3>

                {data.investments.length === 0 ? (
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-xl p-12 border border-gray-200 dark:border-white/10 text-center">
                        <PiggyBank size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Sin inversiones registradas</h4>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                            Comienza a registrar tus inversiones para hacer seguimiento de tu patrimonio.
                        </p>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                            <Plus size={16} /> Añadir primera inversión
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {data.investments.map(inv => {
                            const CategoryIcon = getCategoryIcon(inv.category);
                            return (
                                <div
                                    key={inv.id}
                                    className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10 flex items-center justify-between group hover:shadow-lg hover:border-emerald-500/30 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <CategoryIcon size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{inv.name}</h4>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-xs">
                                                    {getCategoryLabel(inv.category)}
                                                </span>
                                                <span>•</span>
                                                <span>{inv.frequency}</span>
                                                {inv.date && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{new Date(inv.date).toLocaleDateString()}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(inv.amount)}
                                            </p>
                                            <p className="text-xs text-gray-500">{inv.currency}</p>
                                        </div>

                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(inv)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(inv.id)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
