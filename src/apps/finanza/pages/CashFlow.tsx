import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import { calculateAnnualAmount, formatCurrency, calculateTotalAnnual } from '../utils/calculations';
import { calculateISR, calculateNetSalary, SUGGESTED_RATES } from '../utils/salaryCalculations';
import { getIncomeIcon, getExpenseIcon, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../utils/categoryIcons';
import {
    Plus, Trash2, TrendingUp, TrendingDown, Calendar, Save, X, Trophy, Pencil,
    ArrowRightLeft, ArrowDownCircle, ArrowUpCircle, Printer, HeartPulse, CreditCard, Shirt, Coins
} from 'lucide-react';
import { Transaction } from '../types';
import { exportToCSV } from '../../../shared/utils/csvExport';
import { PrintOptionsModal, PrintOptions } from '../components/PrintOptionsModal';

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    bg?: string;
    isNegative?: boolean;
}

interface InputGroupProps {
    label: string;
    children: React.ReactNode;
}

interface ModalProps {
    title: string;
    onClose: () => void;
    onSave: () => void;
    saveLabel: string;
    children: React.ReactNode;
    color: 'green' | 'red';
}

export const CashFlow: React.FC = () => {
    const { t } = useTranslation(['cashflow', 'common']);
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
    const [showPrintModal, setShowPrintModal] = useState(false);
    console.log("CashFlow Loaded - Fix Applied");

    const handlePrint = (options: PrintOptions) => {
        const params = new URLSearchParams();
        if (options.includeBudget) params.append('budget', 'true');
        if (options.includeAccountStatement) {
            params.append('daily', 'true');
            if (options.startDate) params.append('start', options.startDate);
            if (options.endDate) params.append('end', options.endDate);
        }
        window.open(`/finanza/print?${params.toString()}`, '_blank');
        setShowPrintModal(false);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-text flex items-center gap-2">
                        <ArrowRightLeft className="text-primary" /> {t('cashflow:title')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Control centralizado 2026</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start md:self-auto" role="tablist" aria-label="Selector de tipo de transacción">
                    <button
                        onClick={() => setActiveTab('income')}
                        role="tab"
                        aria-selected={activeTab === 'income'}
                        aria-controls="panel-income"
                        id="tab-income"
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'income'
                            ? 'bg-card text-success shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <ArrowUpCircle size={16} aria-hidden="true" /> {t('cashflow:incomes')}
                    </button>
                    <button
                        onClick={() => setActiveTab('expense')}
                        role="tab"
                        aria-selected={activeTab === 'expense'}
                        aria-controls="panel-expense"
                        id="tab-expense"
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expense'
                            ? 'bg-card text-error shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <ArrowDownCircle size={16} aria-hidden="true" /> {t('cashflow:expenses')}
                    </button>
                </div>
            </header>

            <div className="animate-in slide-in-from-bottom-4 duration-300 fade-in">
                {activeTab === 'income'
                    ? <div role="tabpanel" id="panel-income" aria-labelledby="tab-income"><IncomesView onPrint={() => setShowPrintModal(true)} /></div>
                    : <div role="tabpanel" id="panel-expense" aria-labelledby="tab-expense"><ExpensesView /></div>}
            </div>

            {/* Print Modal */}
            <PrintOptionsModal
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                onPrint={handlePrint}
            />
        </div>
    );
};

// --- INCOMES VIEW ---
const IncomesView: React.FC<{ onPrint: () => void }> = ({ onPrint }) => {
    const { t } = useTranslation(['cashflow', 'common']);
    const { data, addTransaction, removeTransaction, updateTransaction, currencies } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newIncome, setNewIncome] = useState<Partial<Transaction>>({
        name: '', amount: 0, frequency: 'Mensual', category: 'Salario', currency: 'DOP', type: 'income',
        deductions: { afp: 0, sfs: 0, isr: 0, others: [] }
    });

    const getIcon = getIncomeIcon;
    const CATEGORIES = INCOME_CATEGORIES;

    const totalIncome = useMemo(() => calculateTotalAnnual(data.incomes, currencies), [data.incomes, currencies]);

    // Calculate total deductions across all income sources
    const totalDeductions = useMemo(() => {
        return data.incomes.reduce((acc, curr) => {
            if (!curr.deductions) return acc;
            const deductionAmount = (curr.deductions.afp || 0) + (curr.deductions.sfs || 0) + (curr.deductions.isr || 0) + (curr.deductions.others?.reduce((s, o) => s + o.amount, 0) || 0);

            // Annualize based on frequency
            let annualDeduction = deductionAmount;
            if (curr.frequency === 'Mensual') annualDeduction *= 12;
            else if (curr.frequency === 'Trimestral') annualDeduction *= 4;

            return acc + annualDeduction;
        }, 0);
    }, [data.incomes]);

    // Net total is total minus deductions (already calculated via calculateTotalAnnual)
    const netTotalIncome = useMemo(() => calculateTotalAnnual(data.incomes, currencies), [data.incomes, currencies]);
    const monthlyAvg = useMemo(() => netTotalIncome / 12, [netTotalIncome]);

    const handleAdd = () => {
        if (!newIncome.name || !newIncome.amount) return;
        const transactionData = {
            name: newIncome.name, amount: Number(newIncome.amount), frequency: newIncome.frequency as Transaction['frequency'],
            category: newIncome.category || 'Salario', currency: newIncome.currency as Transaction['currency'], type: 'income' as const,
            deductions: newIncome.category === 'Salario' ? newIncome.deductions : undefined
        };
        if (editingId) {
            updateTransaction({ id: editingId, ...transactionData });
            setEditingId(null);
        } else {
            addTransaction({ id: Date.now().toString(), ...transactionData });
        }
        setIsAdding(false);
        setNewIncome({ name: '', amount: 0, frequency: 'Mensual', category: 'Salario', currency: 'DOP', type: 'income', deductions: { afp: 0, sfs: 0, isr: 0, others: [] } });
    };

    const handleEdit = (income: Transaction) => {
        setNewIncome({
            name: income.name, amount: income.amount, frequency: income.frequency,
            category: income.category || 'Salario', currency: income.currency || 'DOP', type: 'income',
            deductions: income.deductions || { afp: 0, sfs: 0, isr: 0, others: [] }
        });
        setEditingId(income.id);
        setIsAdding(true);
    };

    const cancelEdit = () => {
        setIsAdding(false);
        setEditingId(null);
        setNewIncome({ name: '', amount: 0, frequency: 'Mensual', category: 'Salario', currency: 'DOP', type: 'income', deductions: { afp: 0, sfs: 0, isr: 0, others: [] } });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => exportToCSV(data.incomes, 'ingresos-2026')}
                    className="flex items-center gap-2 px-4 py-2 bg-card text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all mr-2"
                    aria-label={t('common:export_csv')}
                >
                    {t('common:export_csv')}
                </button>
                <button
                    onClick={onPrint}
                    className="flex items-center gap-2 px-4 py-2 bg-theme-gold text-slate-900 border border-theme-gold rounded-lg text-sm font-semibold shadow-sm hover:bg-yellow-500 transition-all mr-2"
                    aria-label="Imprimir Reporte"
                >
                    <Printer size={18} />
                </button>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setNewIncome({ name: '', amount: 0, frequency: 'Mensual', category: 'Salario', currency: 'DOP', type: 'income' });
                        setIsAdding(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg text-sm font-semibold shadow-lg hover:bg-green-700 transition-all"
                    aria-label={t('cashflow:new_income')}
                >
                    <Plus size={18} aria-hidden="true" /> {t('cashflow:new_income')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label={t('cashflow:net_annual_income')} value={netTotalIncome} icon={TrendingUp} bg="bg-white dark:bg-black/20" />
                <StatCard label={t('cashflow:monthly_average')} value={monthlyAvg} icon={Calendar} bg="bg-white dark:bg-black/20" />
                <StatCard label={t('cashflow:deductions')} value={totalDeductions} icon={TrendingUp} isNegative bg="bg-white dark:bg-black/20" />
            </div>

            {/* List */}
            <div className="bg-white dark:bg-black/20 backdrop-blur-xl rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold border-b border-border">
                                <th className="px-6 py-4">{t('common:concept')}</th>
                                <th className="px-6 py-4">{t('common:frequency')}</th>
                                <th className="px-6 py-4 text-right">{t('common:amount')}</th>
                                <th className="px-6 py-4 text-right">{t('cashflow:annual_impact')}</th>
                                <th className="px-6 py-4 text-center">{t('common:actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {(data.incomes || []).map((income) => {
                                const Icon = getIcon(income.name);
                                const totalDeductions = income.deductions ? (income.deductions.afp || 0) + (income.deductions.sfs || 0) + (income.deductions.isr || 0) + (income.deductions.others?.reduce((s, o) => s + o.amount, 0) || 0) : 0;
                                const netAmount = income.amount - totalDeductions;

                                return (
                                    <React.Fragment key={income.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-success dark:text-green-300 group-hover:scale-110 transition-transform">
                                                    <Icon size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-text">{income.name}</div>
                                                    <div className="text-xs text-gray-500">{income.category || 'Varios'}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{income.frequency}</span></td>
                                            <td className="px-6 py-4 text-right font-medium text-text">
                                                {formatCurrency(netAmount, income.currency || 'DOP')}
                                                {totalDeductions > 0 && <div className="text-xs text-gray-400 line-through">{formatCurrency(income.amount)}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-success dark:text-green-400">{formatCurrency(calculateAnnualAmount({ ...income, amount: netAmount }, currencies))}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => handleEdit(income)} aria-label={`${t('common:edit')} ${income.name}`} className="text-gray-400 hover:text-blue-500 mr-2 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"><Pencil size={18} aria-hidden="true" /></button>
                                                <button onClick={() => removeTransaction(income.id)} aria-label={`${t('common:delete')} ${income.name}`} className="text-gray-400 hover:text-error p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={18} aria-hidden="true" /></button>
                                            </td>
                                        </tr>
                                        {totalDeductions > 0 && income.deductions && (
                                            <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                                                <td colSpan={5} className="px-6 py-2">
                                                    <div className="flex flex-wrap gap-3 text-xs">
                                                        {income.deductions.afp > 0 && (
                                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                                <div className="w-5 h-5 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                                    <TrendingDown size={12} className="text-red-600" />
                                                                </div>
                                                                <span className="font-medium">AFP:</span>
                                                                <span className="text-error">{formatCurrency(income.deductions.afp)}</span>
                                                            </div>
                                                        )}
                                                        {income.deductions.sfs > 0 && (
                                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                                <div className="w-5 h-5 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                                    <HeartPulse size={12} className="text-red-600" />
                                                                </div>
                                                                <span className="font-medium">SFS:</span>
                                                                <span className="text-error">{formatCurrency(income.deductions.sfs)}</span>
                                                            </div>
                                                        )}
                                                        {income.deductions.isr && income.deductions.isr > 0 && (
                                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                                <div className="w-5 h-5 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                                    <CreditCard size={12} className="text-red-600" />
                                                                </div>
                                                                <span className="font-medium">ISR:</span>
                                                                <span className="text-error">{formatCurrency(income.deductions.isr)}</span>
                                                            </div>
                                                        )}
                                                        {income.deductions.others?.map((other, idx) => (
                                                            <div key={idx} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                                <div className="w-5 h-5 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                                    <Shirt size={12} className="text-red-600" />
                                                                </div>
                                                                <span className="font-medium">{other.label}:</span>
                                                                <span className="text-error">{formatCurrency(other.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isAdding && (
                <Modal
                    title={editingId ? t('cashflow:edit_income') : t('cashflow:new_income')}
                    onClose={cancelEdit}
                    onSave={handleAdd}
                    saveLabel={t('common:save')}
                    color="green"
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputGroup label={t('common:concept')}>
                                <input type="text" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 dark:text-white outline-none focus:ring-2 focus:ring-green-500" value={newIncome.name} onChange={e => setNewIncome({ ...newIncome, name: e.target.value })} autoFocus placeholder="Ej. Salario" />
                            </InputGroup>
                            <InputGroup label={t('common:amount')}>
                                <div className="flex gap-2">
                                    <input type="number" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 dark:text-white outline-none focus:ring-2 focus:ring-green-500" value={newIncome.amount || ''} onChange={e => setNewIncome({ ...newIncome, amount: parseFloat(e.target.value) })} placeholder="0.00" />
                                    <select className="p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 dark:text-white outline-none font-bold" value={newIncome.currency || 'DOP'} onChange={e => setNewIncome({ ...newIncome, currency: e.target.value as any })}>
                                        <option value="DOP">DOP</option><option value="USD">USD</option><option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </InputGroup>
                        </div>
                        <InputGroup label={t('common:category')}>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button key={cat.id} onClick={() => setNewIncome({ ...newIncome, category: cat.id })} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${newIncome.category === cat.id ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-success dark:text-green-400 ring-1 ring-green-500' : 'bg-card border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                                        <cat.icon size={20} className="mb-1" /><span className="text-xs font-medium">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </InputGroup>
                        <InputGroup label={t('common:frequency')}>
                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                                {['Mensual', 'Trimestral', 'Anual'].map((freq) => (
                                    <button key={freq} onClick={() => setNewIncome({ ...newIncome, frequency: freq as any })} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newIncome.frequency === freq ? 'bg-white dark:bg-gray-600 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>{freq}</button>
                                ))}
                            </div>
                        </InputGroup>
                        {newIncome.category === 'Salario' && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <TrendingUp size={16} /> Deducciones de Ley (RD)
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <InputGroup label="AFP (2.87%)">
                                        <div className="relative">
                                            <input type="number" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                                                value={newIncome.deductions?.afp || 0}
                                                onChange={e => setNewIncome({ ...newIncome, deductions: { ...newIncome.deductions!, afp: parseFloat(e.target.value) } })}
                                            />
                                            <button onClick={() => setNewIncome({ ...newIncome, deductions: { ...newIncome.deductions!, afp: Number(((newIncome.amount || 0) * SUGGESTED_RATES.AFP).toFixed(2)) } })} className="absolute right-1 top-1 text-[10px] bg-blue-100 text-blue-700 px-1 rounded">Auto</button>
                                        </div>
                                    </InputGroup>
                                    <InputGroup label="SFS (3.04%)">
                                        <div className="relative">
                                            <input type="number" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                                                value={newIncome.deductions?.sfs || 0}
                                                onChange={e => setNewIncome({ ...newIncome, deductions: { ...newIncome.deductions!, sfs: parseFloat(e.target.value) } })}
                                            />
                                            <button onClick={() => setNewIncome({ ...newIncome, deductions: { ...newIncome.deductions!, sfs: Number(((newIncome.amount || 0) * SUGGESTED_RATES.SFS).toFixed(2)) } })} className="absolute right-1 top-1 text-[10px] bg-blue-100 text-blue-700 px-1 rounded">Auto</button>
                                        </div>
                                    </InputGroup>
                                    <InputGroup label="ISR (2025)">
                                        <div className="relative">
                                            <input type="number" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                                                value={newIncome.deductions?.isr || 0}
                                                onChange={e => setNewIncome({ ...newIncome, deductions: { ...newIncome.deductions!, isr: parseFloat(e.target.value) } })}
                                            />
                                            <button onClick={() => {
                                                const amount = newIncome.amount || 0;
                                                let monthlyTaxable = amount;

                                                // Normalize to monthly for ISR calculation table (which is based on monthly income)
                                                if (newIncome.frequency === 'Anual') monthlyTaxable = amount / 12;
                                                else if (newIncome.frequency === 'Trimestral') monthlyTaxable = amount / 3;

                                                const currentDeductions = newIncome.deductions || { afp: 0, sfs: 0, isr: 0, others: [] };
                                                const deductionsAlready = (currentDeductions.afp || 0) + (currentDeductions.sfs || 0);

                                                const taxable = monthlyTaxable - deductionsAlready;
                                                const isr = calculateISR(taxable > 0 ? taxable : 0);

                                                setNewIncome({ ...newIncome, deductions: { ...currentDeductions, isr: Number(isr.toFixed(2)) } })
                                            }} className="absolute right-1 top-1 text-[10px] bg-blue-100 text-blue-700 px-1 rounded">Auto</button>
                                        </div>
                                    </InputGroup>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Otras Deducciones</label>
                                        <button onClick={() => {
                                            const others = newIncome.deductions?.others || [];
                                            setNewIncome({ ...newIncome, deductions: { ...newIncome.deductions!, others: [...others, { label: '', amount: 0 }] } });
                                        }} className="text-xs text-blue-600 font-bold hover:underline">+ Agregar</button>
                                    </div>
                                    <div className="space-y-2">
                                        {newIncome.deductions?.others?.map((other, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input type="text" placeholder="Concepto" className="flex-1 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" value={other.label} onChange={e => {
                                                    const newOthers = [...(newIncome.deductions?.others || [])];
                                                    newOthers[idx].label = e.target.value;
                                                    setNewIncome({ ...newIncome, deductions: { ...newIncome.deductions!, others: newOthers } });
                                                }} />
                                                <input type="number" placeholder="Monto" className="w-24 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" value={other.amount} onChange={e => {
                                                    const newOthers = [...(newIncome.deductions?.others || [])];
                                                    newOthers[idx].amount = parseFloat(e.target.value);
                                                    setNewIncome({ ...newIncome, deductions: { ...newIncome.deductions!, others: newOthers } });
                                                }} />
                                                <button onClick={() => {
                                                    const newOthers = newIncome.deductions?.others?.filter((_, i) => i !== idx);
                                                    setNewIncome({ ...newIncome, deductions: { ...newIncome.deductions!, others: newOthers } });
                                                }} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Salario Neto Estimado:</span>
                                    <span className="text-lg font-bold text-success">
                                        {formatCurrency((newIncome.amount || 0) - ((newIncome.deductions?.afp || 0) + (newIncome.deductions?.sfs || 0) + (newIncome.deductions?.isr || 0) + (newIncome.deductions?.others?.reduce((a, b) => a + b.amount, 0) || 0)))}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

        </div>
    );
};

// --- EXPENSES VIEW ---
const ExpensesView: React.FC = () => {
    const { t } = useTranslation(['cashflow', 'common']);
    const { data, addTransaction, removeTransaction, updateTransaction, currencies } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newExpense, setNewExpense] = useState<Partial<Transaction>>({
        name: '', amount: 0, frequency: 'Mensual', category: 'General', currency: 'DOP', type: 'expense'
    });

    const totalMonthly = useMemo(() => {
        return data.expenses.reduce((acc, curr) => {
            let amountInDOP = Number(curr.amount);
            if (currencies && curr.currency) {
                if (curr.currency === 'USD') amountInDOP *= currencies.usd.rate;
                else if (curr.currency === 'EUR') amountInDOP *= currencies.eur.rate;
            }
            let monthlyImpact = amountInDOP;
            if (curr.frequency === 'Anual') monthlyImpact = amountInDOP / 12;
            else if (curr.frequency === 'Trimestral') monthlyImpact = amountInDOP / 3;
            return acc + monthlyImpact;
        }, 0);
    }, [data.expenses, currencies]);

    const totalAnnual = useMemo(() => calculateTotalAnnual(data.expenses, currencies), [data.expenses, currencies]);

    const getIcon = getExpenseIcon;
    const CATEGORIES = EXPENSE_CATEGORIES;

    const handleAdd = () => {
        if (!newExpense.name || !newExpense.amount) return;
        const transactionData = {
            name: newExpense.name, amount: Number(newExpense.amount), frequency: newExpense.frequency as Transaction['frequency'],
            category: newExpense.category || 'General', currency: newExpense.currency as Transaction['currency'], type: 'expense' as const
        };
        if (editingId) {
            updateTransaction({ id: editingId, ...transactionData });
            setEditingId(null);
        } else {
            addTransaction({ id: Date.now().toString(), ...transactionData });
        }
        setIsAdding(false);
        setNewExpense({ name: '', amount: 0, frequency: 'Mensual', category: 'General', currency: 'DOP', type: 'expense' });
    };

    const handleEdit = (expense: Transaction) => {
        setNewExpense({
            name: expense.name, amount: expense.amount, frequency: expense.frequency,
            category: expense.category || 'General', currency: expense.currency || 'DOP', type: 'expense'
        });
        setEditingId(expense.id);
        setIsAdding(true);
    };

    const cancelEdit = () => {
        setIsAdding(false);
        setEditingId(null);
        setNewExpense({ name: '', amount: 0, frequency: 'Mensual', category: 'General', currency: 'DOP', type: 'expense' });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => exportToCSV(data.expenses, 'gastos-2026')}
                    className="flex items-center gap-2 px-4 py-2 bg-card text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all mr-2"
                    aria-label={t('common:export_csv')}
                >
                    {t('common:export_csv')}
                </button>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setNewExpense({ name: '', amount: 0, frequency: 'Mensual', category: 'General', currency: 'DOP', type: 'expense' });
                        setIsAdding(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg text-sm font-semibold shadow-lg hover:bg-red-700 transition-all"
                    aria-label={t('cashflow:new_expense')}
                >
                    <Plus size={18} aria-hidden="true" /> {t('cashflow:new_expense')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-black/20 p-6 rounded-xl border border-border shadow-sm relative overflow-hidden">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('cashflow:total_monthly')}</h3>
                    <div className="mt-2 text-3xl font-bold text-text">{formatCurrency(totalMonthly)}</div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 flex"><div className="w-1/3 bg-green-500"></div><div className="w-1/3 bg-yellow-400"></div><div className="w-1/3 bg-blue-500"></div></div>
                </div>
                <StatCard label={t('cashflow:annual_impact')} value={totalAnnual} icon={Calendar} bg="bg-white dark:bg-black/20" />
                <div className="bg-white dark:bg-black/20 p-6 rounded-xl border border-border shadow-sm">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('cashflow:major_category')}</h3>
                    <div className="mt-2 text-3xl font-bold text-text">Transporte</div>
                    <p className="text-xs text-orange-500 font-bold mt-2">~{(6000 / (totalMonthly || 1) * 100).toFixed(1)}% del presupuesto</p>
                </div>
            </div>

            <div className="bg-white dark:bg-black/20 backdrop-blur-xl rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold border-b border-border">
                                <th className="px-6 py-4">{t('common:category')}</th>
                                <th className="px-6 py-4 text-right">{t('common:amount')}</th>
                                <th className="px-6 py-4 text-right">{t('cashflow:projected_annual')}</th>
                                <th className="px-6 py-4 text-center">{t('common:frequency')}</th>
                                <th className="px-6 py-4 text-center">{t('common:actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {(data.expenses || []).map(expense => {
                                const Icon = getIcon(expense.name);
                                return (
                                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-error dark:text-red-300 group-hover:scale-110 transition-transform">
                                                <Icon size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-text">{expense.name}</div>
                                                <div className="text-xs text-gray-500">{expense.category || 'General'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-gray-100">
                                            <div>{formatCurrency(expense.amount, expense.currency || 'DOP')}</div>
                                            {expense.currency && expense.currency !== 'DOP' && <div className="text-xs text-gray-500 font-normal">≈ {formatCurrency(expense.currency === 'USD' ? expense.amount * currencies.usd.rate : expense.amount * currencies.eur.rate)}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">{formatCurrency(calculateAnnualAmount(expense, currencies))}</td>
                                        <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${expense.frequency === 'Fijo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>{expense.frequency}</span></td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleEdit(expense)} aria-label={`${t('common:edit')} ${expense.name}`} className="text-gray-400 hover:text-blue-500 mr-2 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"><Pencil size={16} aria-hidden="true" /></button>
                                            <button onClick={() => removeTransaction(expense.id)} aria-label={`${t('common:delete')} ${expense.name}`} className="text-gray-400 hover:text-error p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={16} aria-hidden="true" /></button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-800/50 font-bold text-text border-t border-border text-sm">
                            <tr>
                                <td className="px-6 py-4">Total Gasto Mensual Est. (DOP)</td>
                                <td className="px-6 py-4 text-right text-lg text-error">{formatCurrency(totalMonthly)}</td>
                                <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(totalAnnual)}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isAdding && (
                <Modal
                    title={editingId ? t('cashflow:edit_expense') : t('cashflow:new_expense')}
                    onClose={cancelEdit}
                    onSave={handleAdd}
                    saveLabel={editingId ? t('common:save') : t('common:save')}
                    color="red"
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputGroup label={t('common:concept')}>
                                <input type="text" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 dark:text-white outline-none focus:ring-2 focus:ring-red-500" value={newExpense.name} onChange={e => setNewExpense({ ...newExpense, name: e.target.value })} autoFocus placeholder="Ej. Netflix" />
                            </InputGroup>
                            <InputGroup label={t('common:amount')}>
                                <div className="flex gap-2">
                                    <input type="number" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 dark:text-white outline-none focus:ring-2 focus:ring-red-500" value={newExpense.amount || ''} onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })} placeholder="0.00" />
                                    <select className="p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 dark:text-white outline-none font-bold" value={newExpense.currency || 'DOP'} onChange={e => setNewExpense({ ...newExpense, currency: e.target.value as any })}>
                                        <option value="DOP">DOP</option><option value="USD">USD</option><option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </InputGroup>
                        </div>
                        <InputGroup label={t('common:category')}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button key={cat.id} onClick={() => setNewExpense({ ...newExpense, category: cat.id })} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${newExpense.category === cat.id ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-error dark:text-red-400 ring-1 ring-red-500' : 'bg-card border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                                        <cat.icon size={20} className="mb-1" /><span className="text-xs font-medium">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </InputGroup>
                        <InputGroup label={t('common:frequency')}>
                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                                {['Mensual', 'Fijo', 'Variable', 'Anual'].map((freq) => (
                                    <button key={freq} onClick={() => setNewExpense({ ...newExpense, frequency: freq as any })} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newExpense.frequency === freq ? 'bg-white dark:bg-gray-600 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>{freq}</button>
                                ))}
                            </div>
                        </InputGroup>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// --- SHARED COMPONENTS ---
const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, bg, isNegative }) => (
    <div className={`${bg} p-6 rounded-xl shadow-sm border border-border relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500`}>
            <Icon size={80} />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <Icon size={20} />
                <span className="text-sm font-bold uppercase tracking-wide">{label}</span>
            </div>
            <h3 className={`text-3xl font-bold ${isNegative ? 'text-error' : 'text-text'} mt-1`}>
                {formatCurrency(value)}
            </h3>
        </div>
    </div>
);

const InputGroup: React.FC<InputGroupProps> = ({ label, children }) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        {children}
    </div>
);

const Modal: React.FC<ModalProps> = ({ title, onClose, onSave, saveLabel, children, color }) => {
    const { t } = useTranslation('common');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={`px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50`}>
                    <h3 id="modal-title" className="text-lg font-bold text-text">{title}</h3>
                    <button onClick={onClose} aria-label={t('cancel')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"><X size={20} aria-hidden="true" /></button>
                </div>
                <div className="p-6">{children}</div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">{t('cancel')}</button>
                    <button onClick={onSave} className={`bg-${color}-600 hover:bg-${color}-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2`}>
                        <Save size={18} aria-hidden="true" /> {saveLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
