import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency } from '../utils/calculations';
import { Transaction } from '../types';
import { AssetAllocation } from '../components/AssetAllocation';
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
    Target,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    Briefcase
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
        currentValue: '',
        category: 'ahorro',
        frequency: 'Mensual' as Transaction['frequency'],
        currency: 'DOP' as Transaction['currency'],
        date: new Date().toISOString().split('T')[0],
    });

    const calculateMetrics = useMemo(() => {
        let invested = 0;
        let current = 0;

        data.investments.forEach(inv => {
            invested += inv.amount;
            current += (inv.currentValue ?? inv.amount);
        });

        const pnl = current - invested;
        const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

        return { invested, current, pnl, pnlPercent };
    }, [data.investments]);

    const resetForm = () => {
        setFormData({
            name: '',
            amount: '',
            currentValue: '',
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
            currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
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
            currentValue: inv.currentValue?.toString() || '',
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
        <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 pb-32">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Briefcase className="text-emerald-500" size={32} />
                        Portafolio de Inversiones
                    </h2>
                    <p className="mt-1 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
                        Gestiona y monitorea el rendimiento de tus activos financieros a largo plazo.
                    </p>
                </div>
                <div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                        <Plus size={20} /> Nueva Inversión
                    </button>
                </div>
            </div>

            {/* KPI ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Total Value Logic */}
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-white opacity-10 blur-xl group-hover:scale-110 transition-transform duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Valor de Mercado</p>
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                <DollarSign size={20} className="text-white" />
                            </div>
                        </div>
                        <h3 className="text-4xl font-extrabold tracking-tight mb-4">{formatCurrency(calculateMetrics.current)}</h3>

                        <div className="flex items-center gap-2">
                            <span className={`flex items-center text-xs font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 ${calculateMetrics.pnl >= 0 ? 'text-white' : 'text-red-200'}`}>
                                {calculateMetrics.pnl >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {Math.abs(calculateMetrics.pnlPercent).toFixed(1)}% ROI
                            </span>
                            <span className="text-xs font-medium text-emerald-100 opacity-80">
                                {calculateMetrics.pnl >= 0 ? '+' : ''}{formatCurrency(calculateMetrics.pnl)} (Ganancia Neta)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Invested Capital */}
                <KPIPlain
                    label="Capital Invertido"
                    value={calculateMetrics.invested}
                    icon={PiggyBank}
                    color="text-blue-500"
                    desc="Monto total aportado sin contar rendimientos."
                />

                {/* Asset Count */}
                <KPIPlain
                    label="Total Activos"
                    value={data.investments.length}
                    icon={Briefcase}
                    color="text-purple-500"
                    desc="Número de instrumentos financieros activos."
                    suffix=""
                    isCurrency={false}
                />
            </div>

            {/* MAIN DASHBOARD GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                {/* LEFT COLUMN: LIST (8 Span) */}
                <div className="xl:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Briefcase size={20} className="text-slate-400" />
                            Activos en Cartera
                        </h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full uppercase tracking-wider">
                            {data.investments.length} Items Listed
                        </span>
                    </div>

                    {data.investments.length === 0 ? (
                        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl p-12 border border-dashed border-gray-300 dark:border-white/10 text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PiggyBank size={32} className="text-gray-400" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">Tu portafolio está vacío</h4>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-md mx-auto">
                                Comienza a registrar tus inversiones para visualizar tu crecimiento patrimonial y diversificación.
                            </p>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                            >
                                <Plus size={16} /> Añadir primera inversión
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {data.investments.map(inv => {
                                const CategoryIcon = getCategoryIcon(inv.category);
                                const currentVal = inv.currentValue ?? inv.amount;
                                const gain = currentVal - inv.amount;
                                const gainPercent = inv.amount > 0 ? (gain / inv.amount) * 100 : 0;

                                return (
                                    <div
                                        key={inv.id}
                                        className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-xl p-5 border border-gray-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between group hover:shadow-lg hover:border-emerald-500/30 transition-all relative overflow-hidden"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 transition-colors">
                                                <CategoryIcon size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{inv.name}</h4>
                                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                    <span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px]">
                                                        {getCategoryLabel(inv.category)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{inv.frequency}</span>
                                                    <span>•</span>
                                                    <span>{inv.currency}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-8 md:gap-12 w-full md:w-auto">
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Costo Base</p>
                                                <p className="font-bold text-gray-600 dark:text-gray-300 font-mono">
                                                    {formatCurrency(inv.amount)}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Valor Actual</p>
                                                <p className="font-extrabold text-gray-900 dark:text-white text-lg font-mono">{formatCurrency(currentVal)}</p>
                                                {inv.currentValue && (
                                                    <p className={`text-xs font-bold ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {gain >= 0 ? '+' : ''}{gainPercent.toFixed(1)}% ({gain >= 0 ? '+' : ''}{formatCurrency(gain)})
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(inv)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(inv.id)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: SIDEBAR (4 Span) */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Asset Allocation Sidebar */}
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-sm flex flex-col min-h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <PieChart size={18} /> Diversificación
                            </h3>
                        </div>
                        <div className="flex-1">
                            <AssetAllocation investments={data.investments} />
                        </div>
                        <p className="text-xs text-center text-gray-400 mt-4 leading-relaxed">
                            Una cartera diversificada reduce el riesgo y estabiliza los retornos a largo plazo.
                        </p>
                    </div>

                    {/* Quick Stats or Tips could go here */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-white/5">
                        <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2 text-sm flex items-center gap-2">
                            <Target size={16} /> Estrategia
                        </h4>
                        <p className="text-xs text-indigo-800/70 dark:text-indigo-200/70 leading-relaxed">
                            Mantén tu asignación de activos alineada con tu horizonte temporal y tolerancia al riesgo. Rebalancea periódicamente.
                        </p>
                    </div>
                </div>

            </div>

            {/* Add/Edit Form Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-white/10 max-h-[90vh] overflow-y-auto transform scale-100 opacity-100 transition-all">
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                                    <PiggyBank size={20} />
                                </div>
                                {editingId ? 'Editar Inversión' : 'Nueva Inversión'}
                            </h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Nombre */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nombre del Activo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-400"
                                    placeholder="Ej: Fondo de emergencia, Acciones AAPL..."
                                />
                            </div>

                            {/* Monto y Valor Actual */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Costo Inicial</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Valor Mercado <span className="text-[10px] lowercase font-normal opacity-70">(opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <TrendingUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.currentValue}
                                            onChange={(e) => setFormData(prev => ({ ...prev, currentValue: e.target.value }))}
                                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono"
                                            placeholder={formData.amount || "0.00"}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Moneda</label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as Transaction['currency'] }))}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="DOP">Peso Dominicano (DOP)</option>
                                        <option value="USD">Dólar (USD)</option>
                                        <option value="EUR">Euro (EUR)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Fecha Inicio</label>
                                    <div className="relative">
                                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Categoría */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Categoría</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {INVESTMENT_CATEGORIES.map(cat => {
                                        const Icon = cat.icon;
                                        const isSelected = formData.category === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${isSelected
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/50'
                                                    : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                                                    }`}
                                            >
                                                <Icon size={20} className={isSelected ? 'text-emerald-600' : 'opacity-70'} />
                                                <span className="text-[10px] font-bold uppercase">{cat.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Frecuencia */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tipo de Aporte</label>
                                <select
                                    value={formData.frequency}
                                    onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as Transaction['frequency'] }))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all appearance-none"
                                >
                                    <option value="Mensual">Recurrente (Mensual)</option>
                                    <option value="Fijo">Único (Capital Fijo)</option>
                                    <option value="Variable">Variable (Irregular)</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-transform active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    <Save size={18} /> {editingId ? 'Actualizar Activo' : 'Guardar Activo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub Component for standard KPIs
const KPIPlain = ({ label, value, icon: Icon, color, desc, suffix = '', isCurrency = true }: any) => (
    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between h-full group hover:border-emerald-500/20 transition-all">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                    {isCurrency ? formatCurrency(value) : value}{suffix}
                </h3>
            </div>
            <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('500', '100')} dark:bg-white/5`}>
                <Icon size={24} className={color} />
            </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
            {desc}
        </p>
    </div>
);
