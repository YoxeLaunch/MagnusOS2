import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import { calculateAnnualAmount, calculateAnnualAmountV2, formatCurrency, calculateTotalAnnual } from '../utils/calculations';
import { calculateISR, calculateNetSalary, SUGGESTED_RATES } from '../utils/salaryCalculations';
import { getCategoryIcon, INCOME_CATEGORIES, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_GROUPS } from '../utils/categoryIcons';
import { CategoryPicker } from '../components/CategoryPicker';
import {
    Plus, Trash2, TrendingUp, TrendingDown, Calendar, Save, X, Trophy, Pencil,
    ArrowRightLeft, ArrowDownCircle, ArrowUpCircle, Printer, HeartPulse, CreditCard, Shirt, Coins,
    ArrowUpRight, ChevronDown, ChevronRight, FileText, Tag, CalendarClock, ShieldCheck
} from 'lucide-react';
import { Transaction } from '../types';
import { exportToCSV } from '../../../shared/utils/csvExport';
import { PrintOptionsModal, PrintOptions } from '../components/PrintOptionsModal';
import { DatePicker } from '../../../shared/components/ui/DatePicker';

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

// Previsualiza el impacto anual de un borrador de ingreso/gasto mientras se edita en el modal,
// usando la misma lógica que la columna "Impacto Anual" de la tabla.
const estimateAnnualImpact = (draft: Partial<Transaction>, currencies: any): number => {
    if (!draft.amount || !draft.frequency) return 0;
    const deductionAmount = draft.deductions ? (draft.deductions.afp || 0) + (draft.deductions.sfs || 0) + (draft.deductions.isr || 0) + (draft.deductions.others?.reduce((s, o) => s + o.amount, 0) || 0) : 0;
    const netAmount = draft.amount - deductionAmount;
    return calculateAnnualAmountV2({
        id: 'preview', name: draft.name || '', amount: netAmount, frequency: draft.frequency,
        category: draft.category || '', currency: draft.currency || 'DOP', type: draft.type || 'expense',
        validFrom: draft.validFrom, validTo: draft.validTo
    } as Transaction, currencies);
};

// Tarjeta con encabezado propio para agrupar secciones del formulario (Datos Básicos, Categoría, etc.)
const SectionCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
        <h4 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700/70">
            <Icon size={13} /> {title}
        </h4>
        {children}
    </div>
);

const SummaryPreview: React.FC<{ draft: Partial<Transaction>; currencies: any; accent: 'green' | 'red'; totalForShare?: number }> = ({ draft, currencies, accent, totalForShare }) => {
    const annualImpact = estimateAnnualImpact(draft, currencies);
    const monthlyEquivalent = annualImpact / 12;
    const CatIcon = getCategoryIcon(draft.category, draft.type as any);
    const share = totalForShare && totalForShare > 0 ? Math.min(100, (annualImpact / totalForShare) * 100) : null;
    const tint = accent === 'green'
        ? { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-success dark:text-green-400', barBg: 'bg-green-200 dark:bg-green-900/40', bar: 'bg-green-500' }
        : { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-error dark:text-red-400', barBg: 'bg-red-200 dark:bg-red-900/40', bar: 'bg-red-500' };
    return (
        <div className={`p-5 rounded-xl border space-y-4 self-start ${tint.bg} ${tint.border}`}>
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-card flex items-center justify-center shrink-0">
                    <CatIcon size={20} className={tint.text} />
                </div>
                <div className="min-w-0">
                    <div className={`font-bold truncate ${tint.text}`}>{draft.category || 'Sin categoría'}</div>
                    <div className={`text-xs truncate opacity-80 ${tint.text}`}>{draft.name || 'Nuevo concepto'}</div>
                </div>
            </div>

            <div>
                <div className={`text-xs uppercase font-semibold opacity-80 ${tint.text}`}>Impacto Anual Estimado</div>
                <div className={`text-3xl font-bold ${tint.text}`}>{formatCurrency(annualImpact)}</div>
            </div>
            <div className={`h-1.5 w-full rounded-full overflow-hidden ${tint.barBg}`}>
                <div className={`h-full rounded-full ${tint.bar}`} style={{ width: '100%' }}></div>
            </div>

            <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                    <span className={`text-xs opacity-80 ${tint.text}`}>Equivalente Mensual</span>
                    <span className={`font-medium ${tint.text}`}>{formatCurrency(monthlyEquivalent)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className={`text-xs opacity-80 ${tint.text}`}>Frecuencia</span>
                    <span className={`font-medium ${tint.text}`}>{draft.frequency || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className={`text-xs opacity-80 ${tint.text}`}>Vigencia</span>
                    <span className={`font-medium text-right ${tint.text}`}>{draft.validFrom || 'Todo el año'}{draft.validTo ? ` a ${draft.validTo}` : ''}</span>
                </div>
            </div>

            {share !== null && (
                <div className={`pt-3 border-t text-xs ${tint.border} ${tint.text} opacity-90`}>
                    Este {accent === 'green' ? 'ingreso' : 'gasto'} representa el <strong>{share.toFixed(1)}%</strong> de tu presupuesto anual {accent === 'green' ? 'de ingresos' : 'de gastos'}
                </div>
            )}
        </div>
    );
};

export const CashFlow: React.FC = () => {
    const { t } = useTranslation(['cashflow', 'common']);
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
    const [showPrintModal, setShowPrintModal] = useState(false);
    console.log("CashFlow Loaded - Fix Applied");

    const handlePrint = (options: PrintOptions) => {
        const params = new URLSearchParams();
        if (options.includeSummary) params.append('summary', 'true');
        if (options.includeBudget) params.append('budget', 'true');
        if (options.includeInvestments) params.append('investments', 'true');
        if (options.includeForecast) params.append('forecast', 'true');
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
        deductions: { afp: 0, sfs: 0, isr: 0, others: [] }, validFrom: '', validTo: ''
    });

    const CATEGORIES = INCOME_CATEGORIES;
    const [raiseSource, setRaiseSource] = useState<Transaction | null>(null);
    const [expandedConcepts, setExpandedConcepts] = useState<Set<string>>(new Set());

    const recentCategoryIds = useMemo(() => {
        const counts: Record<string, number> = {};
        (data.incomes || []).forEach(i => { if (i.category) counts[i.category] = (counts[i.category] || 0) + 1; });
        return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([id]) => id);
    }, [data.incomes]);

    const totalIncome = useMemo(() => {
        return data.incomes.reduce((acc, curr) => acc + calculateAnnualAmountV2(curr, currencies), 0);
    }, [data.incomes, currencies]);

    // Calculate total deductions across all income sources
    const totalDeductions = useMemo(() => {
        return data.incomes.reduce((acc, curr) => {
            if (!curr.deductions) return acc;
            const deductionAmount = (curr.deductions.afp || 0) + (curr.deductions.sfs || 0) + (curr.deductions.isr || 0) + (curr.deductions.others?.reduce((s, o) => s + o.amount, 0) || 0);

            // Annualize based on frequency - ideally this should also respect V2 proportional but we leave it as V1 for deduction simplicity to avoid over-complicating initially, or apply the proportion
            const annualImpact = calculateAnnualAmountV2({ ...curr, amount: deductionAmount }, currencies);
            return acc + annualImpact;
        }, 0);
    }, [data.incomes, currencies]);

    // Net total is calculated correctly via V2 amounts
    const netTotalIncome = useMemo(() => {
        return data.incomes.reduce((acc, income) => {
            const deductionAmount = income.deductions ? (income.deductions.afp || 0) + (income.deductions.sfs || 0) + (income.deductions.isr || 0) + (income.deductions.others?.reduce((s, o) => s + o.amount, 0) || 0) : 0;
            const netAmount = income.amount - deductionAmount;
            return acc + calculateAnnualAmountV2({ ...income, amount: netAmount }, currencies);
        }, 0);
    }, [data.incomes, currencies]);
    const monthlyAvg = useMemo(() => netTotalIncome / 12, [netTotalIncome]);

    // Agrupa versiones de un mismo concepto (ej. aumentos de salario) por conceptId.
    // Filas sin conceptId se muestran igual que siempre, una por una.
    const displayIncomes = useMemo(() => {
        const byConceptId: Record<string, Transaction[]> = {};
        const standalone: Transaction[] = [];
        (data.incomes || []).forEach(income => {
            if (income.conceptId) {
                (byConceptId[income.conceptId] ||= []).push(income);
            } else {
                standalone.push(income);
            }
        });
        const groups = Object.values(byConceptId).map(versions => {
            const sorted = [...versions].sort((a, b) => (a.validFrom || '').localeCompare(b.validFrom || ''));
            const active = sorted.find(v => !v.validTo) || sorted[sorted.length - 1];
            const history = sorted.filter(v => v.id !== active.id);
            return { active, history };
        });
        return [
            ...standalone.map(income => ({ active: income, history: [] as Transaction[] })),
            ...groups
        ];
    }, [data.incomes]);

    const resetIncomeForm = () => setNewIncome({ name: '', amount: 0, frequency: 'Mensual', category: 'Salario', currency: 'DOP', type: 'income', deductions: { afp: 0, sfs: 0, isr: 0, others: [] }, validFrom: '', validTo: '' });

    const handleAdd = () => {
        if (!newIncome.name || !newIncome.amount) return;

        // "Registrar cambio de monto": cierra la versión anterior y crea una nueva enlazada por conceptId
        if (raiseSource) {
            const effectiveDate = newIncome.validFrom || new Date().toISOString().slice(0, 10);
            const prevDay = new Date(effectiveDate + 'T12:00:00');
            prevDay.setDate(prevDay.getDate() - 1);
            const conceptId = raiseSource.conceptId || raiseSource.id;

            updateTransaction({ ...raiseSource, conceptId, validTo: prevDay.toISOString().slice(0, 10) });
            addTransaction({
                id: Date.now().toString(),
                name: raiseSource.name,
                amount: Number(newIncome.amount),
                frequency: newIncome.frequency as Transaction['frequency'],
                category: raiseSource.category || 'Salario',
                currency: newIncome.currency as Transaction['currency'],
                type: 'income',
                deductions: raiseSource.category === 'Salario' ? newIncome.deductions : undefined,
                validFrom: effectiveDate,
                validTo: undefined,
                conceptId
            });
            setRaiseSource(null);
            setIsAdding(false);
            resetIncomeForm();
            return;
        }

        const transactionData = {
            name: newIncome.name, amount: Number(newIncome.amount), frequency: newIncome.frequency as Transaction['frequency'],
            category: newIncome.category || 'Salario', currency: newIncome.currency as Transaction['currency'], type: 'income' as const,
            deductions: newIncome.category === 'Salario' ? newIncome.deductions : undefined,
            validFrom: newIncome.validFrom || undefined,
            validTo: newIncome.validTo || undefined
        };
        if (editingId) {
            updateTransaction({ id: editingId, ...transactionData });
            setEditingId(null);
        } else {
            addTransaction({ id: Date.now().toString(), ...transactionData });
        }
        setIsAdding(false);
        resetIncomeForm();
    };

    const handleEdit = (income: Transaction) => {
        setNewIncome({
            name: income.name, amount: income.amount, frequency: income.frequency,
            category: income.category || 'Salario', currency: income.currency || 'DOP', type: 'income',
            deductions: income.deductions || { afp: 0, sfs: 0, isr: 0, others: [] },
            validFrom: income.validFrom || '',
            validTo: income.validTo || ''
        });
        setEditingId(income.id);
        setRaiseSource(null);
        setIsAdding(true);
    };

    const handleRaise = (income: Transaction) => {
        setRaiseSource(income);
        setNewIncome({
            name: income.name, amount: 0, frequency: income.frequency,
            category: income.category || 'Salario', currency: income.currency || 'DOP', type: 'income',
            deductions: income.deductions || { afp: 0, sfs: 0, isr: 0, others: [] },
            validFrom: '', validTo: ''
        });
        setEditingId(null);
        setIsAdding(true);
    };

    const toggleExpanded = (conceptId: string) => {
        setExpandedConcepts(prev => {
            const next = new Set(prev);
            if (next.has(conceptId)) next.delete(conceptId); else next.add(conceptId);
            return next;
        });
    };

    const cancelEdit = () => {
        setIsAdding(false);
        setEditingId(null);
        setRaiseSource(null);
        resetIncomeForm();
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
                            {displayIncomes.map(({ active: income, history }) => {
                                const Icon = getCategoryIcon(income.category, 'income');
                                const totalDeductions = income.deductions ? (income.deductions.afp || 0) + (income.deductions.sfs || 0) + (income.deductions.isr || 0) + (income.deductions.others?.reduce((s, o) => s + o.amount, 0) || 0) : 0;
                                const netAmount = income.amount - totalDeductions;
                                const conceptKey = income.conceptId || income.id;
                                const isExpanded = expandedConcepts.has(conceptKey);

                                return (
                                    <React.Fragment key={income.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                {history.length > 0 ? (
                                                    <button onClick={() => toggleExpanded(conceptKey)} aria-label={isExpanded ? 'Ocultar historial' : 'Ver historial'} className="text-gray-400 hover:text-gray-600 shrink-0">
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </button>
                                                ) : <span className="w-4 shrink-0" />}
                                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-success dark:text-green-300 group-hover:scale-110 transition-transform shrink-0">
                                                    <Icon size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-text">
                                                        {income.name}
                                                        {history.length > 0 && (
                                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                {history.length + 1} versiones
                                                            </span>
                                                        )}
                                                        {history.length === 0 && (income.validFrom || income.validTo) && (
                                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                                Temporal
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{income.category || 'Varios'}{income.validFrom ? ` · vigente desde ${income.validFrom}` : ''}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">{income.frequency}</span></td>
                                            <td className="px-6 py-4 text-right font-medium text-text">
                                                {formatCurrency(netAmount, income.currency || 'DOP')}
                                                {totalDeductions > 0 && <div className="text-xs text-gray-400 line-through">{formatCurrency(income.amount)}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-success dark:text-green-400">{formatCurrency(calculateAnnualAmountV2({ ...income, amount: netAmount }, currencies))}</td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <button onClick={() => handleRaise(income)} aria-label={`Registrar cambio de monto para ${income.name}`} title="Registrar cambio de monto" className="text-gray-400 hover:text-success mr-2 p-2 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"><ArrowUpRight size={18} aria-hidden="true" /></button>
                                                <button onClick={() => handleEdit(income)} aria-label={`${t('common:edit')} ${income.name}`} className="text-gray-400 hover:text-blue-500 mr-2 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"><Pencil size={18} aria-hidden="true" /></button>
                                                <button onClick={() => removeTransaction(income.id)} aria-label={`${t('common:delete')} ${income.name}`} className="text-gray-400 hover:text-error p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={18} aria-hidden="true" /></button>
                                            </td>
                                        </tr>
                                        {isExpanded && history.map(version => (
                                            <tr key={version.id} className="bg-gray-50/50 dark:bg-gray-800/20 text-gray-500 dark:text-gray-400">
                                                <td className="px-6 py-2 pl-16 text-sm">
                                                    {version.validFrom || '—'} a {version.validTo || '—'}
                                                </td>
                                                <td className="px-6 py-2 text-sm">{version.frequency}</td>
                                                <td className="px-6 py-2 text-right text-sm">{formatCurrency(version.amount, version.currency || 'DOP')}</td>
                                                <td className="px-6 py-2 text-right text-sm">{formatCurrency(calculateAnnualAmountV2(version, currencies))}</td>
                                                <td className="px-6 py-2 text-center">
                                                    <button onClick={() => removeTransaction(version.id)} aria-label={`${t('common:delete')} versión`} className="text-gray-400 hover:text-error p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={14} aria-hidden="true" /></button>
                                                </td>
                                            </tr>
                                        ))}
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
                    title={raiseSource ? `Registrar cambio de monto: ${raiseSource.name}` : (editingId ? t('cashflow:edit_income') : t('cashflow:new_income'))}
                    onClose={cancelEdit}
                    onSave={handleAdd}
                    saveLabel={raiseSource ? 'Registrar' : t('common:save')}
                    color="green"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            {raiseSource && (
                                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
                                    Nueva versión de <strong>{raiseSource.name}</strong>. La versión anterior se cerrará automáticamente en la fecha "Válido Desde" que indiques.
                                </div>
                            )}
                            <SectionCard title="Datos Básicos" icon={FileText}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputGroup label={t('common:concept')}>
                                        <input type="text" disabled={!!raiseSource} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 dark:text-white outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60" value={newIncome.name} onChange={e => setNewIncome({ ...newIncome, name: e.target.value })} autoFocus placeholder="Ej. Salario" />
                                    </InputGroup>
                                    <InputGroup label={t('common:amount')}>
                                        <div className="flex gap-2">
                                            <input type="number" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 dark:text-white outline-none focus:ring-2 focus:ring-green-500" value={newIncome.amount || ''} onChange={e => setNewIncome({ ...newIncome, amount: parseFloat(e.target.value) })} placeholder="0.00" />
                                            <select className="p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 dark:text-white outline-none font-bold" value={newIncome.currency || 'DOP'} onChange={e => setNewIncome({ ...newIncome, currency: e.target.value as any })}>
                                                <option value="DOP">DOP</option><option value="USD">USD</option><option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                    </InputGroup>
                                </div>
                            </SectionCard>

                            <SectionCard title="Frecuencia y Vigencia" icon={CalendarClock}>
                                <div className="flex bg-white dark:bg-gray-700 p-1 rounded-xl mb-3">
                                    {['Mensual', 'Trimestral', 'Anual'].map((freq) => (
                                        <button key={freq} onClick={() => setNewIncome({ ...newIncome, frequency: freq as any })} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newIncome.frequency === freq ? 'bg-gray-100 dark:bg-gray-600 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>{freq}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputGroup label={raiseSource ? 'Vigente Desde' : 'Válido Desde (Opcional)'}>
                                        <DatePicker value={newIncome.validFrom || ''} onChange={date => setNewIncome({ ...newIncome, validFrom: date })} />
                                    </InputGroup>
                                    <InputGroup label="Válido Hasta (Opcional)">
                                        <DatePicker value={newIncome.validTo || ''} onChange={date => setNewIncome({ ...newIncome, validTo: date })} />
                                    </InputGroup>
                                </div>
                            </SectionCard>

                        {newIncome.category === 'Salario' && (
                            <SectionCard title="Deducciones de Ley (RD)" icon={ShieldCheck}>
                                <div className="grid grid-cols-2 gap-3">
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

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Salario Neto Estimado:</span>
                                        <span className="text-lg font-bold text-success">
                                            {formatCurrency((newIncome.amount || 0) - ((newIncome.deductions?.afp || 0) + (newIncome.deductions?.sfs || 0) + (newIncome.deductions?.isr || 0) + (newIncome.deductions?.others?.reduce((a, b) => a + b.amount, 0) || 0)))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500 uppercase font-semibold">Impacto Anual Estimado</span>
                                        <span className="text-sm font-bold text-success">{formatCurrency(estimateAnnualImpact(newIncome, currencies))}</span>
                                    </div>
                                </div>
                            </SectionCard>
                        )}
                        </div>
                        <div className="space-y-5">
                            <SummaryPreview draft={newIncome} currencies={currencies} accent="green" totalForShare={netTotalIncome} />
                            <SectionCard title="Categoría" icon={Tag}>
                                <CategoryPicker
                                    categories={CATEGORIES}
                                    value={newIncome.category}
                                    onChange={id => setNewIncome({ ...newIncome, category: id })}
                                    recentIds={recentCategoryIds}
                                    disabled={!!raiseSource}
                                    accent="green"
                                />
                            </SectionCard>
                        </div>
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
        name: '', amount: 0, frequency: 'Mensual', category: 'General', currency: 'DOP', type: 'expense', validFrom: '', validTo: ''
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

    const totalAnnual = useMemo(() => {
        return data.expenses.reduce((acc, curr) => acc + calculateAnnualAmountV2(curr, currencies), 0);
    }, [data.expenses, currencies]);

    const CATEGORIES = EXPENSE_CATEGORIES;
    const [raiseSource, setRaiseSource] = useState<Transaction | null>(null);
    const [expandedConcepts, setExpandedConcepts] = useState<Set<string>>(new Set());

    const recentCategoryIds = useMemo(() => {
        const counts: Record<string, number> = {};
        (data.expenses || []).forEach(e => { if (e.category) counts[e.category] = (counts[e.category] || 0) + 1; });
        return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([id]) => id);
    }, [data.expenses]);

    // Agrupa versiones de un mismo concepto (ej. aumento de alquiler, cambio de precio de una suscripción)
    const displayExpenses = useMemo(() => {
        const byConceptId: Record<string, Transaction[]> = {};
        const standalone: Transaction[] = [];
        (data.expenses || []).forEach(expense => {
            if (expense.conceptId) {
                (byConceptId[expense.conceptId] ||= []).push(expense);
            } else {
                standalone.push(expense);
            }
        });
        const groups = Object.values(byConceptId).map(versions => {
            const sorted = [...versions].sort((a, b) => (a.validFrom || '').localeCompare(b.validFrom || ''));
            const active = sorted.find(v => !v.validTo) || sorted[sorted.length - 1];
            const history = sorted.filter(v => v.id !== active.id);
            return { active, history };
        });
        return [
            ...standalone.map(expense => ({ active: expense, history: [] as Transaction[] })),
            ...groups
        ];
    }, [data.expenses]);

    const resetExpenseForm = () => setNewExpense({ name: '', amount: 0, frequency: 'Mensual', category: 'General', currency: 'DOP', type: 'expense', validFrom: '', validTo: '' });

    const handleAdd = () => {
        if (!newExpense.name || !newExpense.amount) return;

        // "Registrar cambio de monto": cierra la versión anterior y crea una nueva enlazada por conceptId
        if (raiseSource) {
            const effectiveDate = newExpense.validFrom || new Date().toISOString().slice(0, 10);
            const prevDay = new Date(effectiveDate + 'T12:00:00');
            prevDay.setDate(prevDay.getDate() - 1);
            const conceptId = raiseSource.conceptId || raiseSource.id;

            updateTransaction({ ...raiseSource, conceptId, validTo: prevDay.toISOString().slice(0, 10) });
            addTransaction({
                id: Date.now().toString(),
                name: raiseSource.name,
                amount: Number(newExpense.amount),
                frequency: newExpense.frequency as Transaction['frequency'],
                category: raiseSource.category || 'General',
                currency: newExpense.currency as Transaction['currency'],
                type: 'expense',
                validFrom: effectiveDate,
                validTo: undefined,
                conceptId
            });
            setRaiseSource(null);
            setIsAdding(false);
            resetExpenseForm();
            return;
        }

        const transactionData = {
            name: newExpense.name, amount: Number(newExpense.amount), frequency: newExpense.frequency as Transaction['frequency'],
            category: newExpense.category || 'General', currency: newExpense.currency as Transaction['currency'], type: 'expense' as const,
            validFrom: newExpense.validFrom || undefined,
            validTo: newExpense.validTo || undefined
        };
        if (editingId) {
            updateTransaction({ id: editingId, ...transactionData });
            setEditingId(null);
        } else {
            addTransaction({ id: Date.now().toString(), ...transactionData });
        }
        setIsAdding(false);
        resetExpenseForm();
    };

    const handleEdit = (expense: Transaction) => {
        setNewExpense({
            name: expense.name, amount: expense.amount, frequency: expense.frequency,
            category: expense.category || 'General', currency: expense.currency || 'DOP', type: 'expense',
            validFrom: expense.validFrom || '',
            validTo: expense.validTo || ''
        });
        setEditingId(expense.id);
        setRaiseSource(null);
        setIsAdding(true);
    };

    const handleRaise = (expense: Transaction) => {
        setRaiseSource(expense);
        setNewExpense({
            name: expense.name, amount: 0, frequency: expense.frequency,
            category: expense.category || 'General', currency: expense.currency || 'DOP', type: 'expense',
            validFrom: '', validTo: ''
        });
        setEditingId(null);
        setIsAdding(true);
    };

    const toggleExpanded = (conceptId: string) => {
        setExpandedConcepts(prev => {
            const next = new Set(prev);
            if (next.has(conceptId)) next.delete(conceptId); else next.add(conceptId);
            return next;
        });
    };

    const cancelEdit = () => {
        setIsAdding(false);
        setEditingId(null);
        setRaiseSource(null);
        resetExpenseForm();
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
                            {displayExpenses.map(({ active: expense, history }) => {
                                const Icon = getCategoryIcon(expense.category, 'expense');
                                const conceptKey = expense.conceptId || expense.id;
                                const isExpanded = expandedConcepts.has(conceptKey);
                                return (
                                    <React.Fragment key={expense.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                {history.length > 0 ? (
                                                    <button onClick={() => toggleExpanded(conceptKey)} aria-label={isExpanded ? 'Ocultar historial' : 'Ver historial'} className="text-gray-400 hover:text-gray-600 shrink-0">
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </button>
                                                ) : <span className="w-4 shrink-0" />}
                                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-error dark:text-red-300 group-hover:scale-110 transition-transform shrink-0">
                                                    <Icon size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-text">
                                                        {expense.name}
                                                        {history.length > 0 && (
                                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                {history.length + 1} versiones
                                                            </span>
                                                        )}
                                                        {history.length === 0 && (expense.validFrom || expense.validTo) && (
                                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                                Temporal
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{expense.category || 'General'}{expense.validFrom ? ` · vigente desde ${expense.validFrom}` : ''}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-gray-100">
                                                <div>{formatCurrency(expense.amount, expense.currency || 'DOP')}</div>
                                                {expense.currency && expense.currency !== 'DOP' && <div className="text-xs text-gray-500 font-normal">≈ {formatCurrency(expense.currency === 'USD' ? expense.amount * currencies.usd.rate : expense.amount * currencies.eur.rate)}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">{formatCurrency(calculateAnnualAmountV2(expense, currencies))}</td>
                                            <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${expense.frequency === 'Fijo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>{expense.frequency}</span></td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <button onClick={() => handleRaise(expense)} aria-label={`Registrar cambio de monto para ${expense.name}`} title="Registrar cambio de monto" className="text-gray-400 hover:text-error mr-2 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><ArrowUpRight size={16} aria-hidden="true" /></button>
                                                <button onClick={() => handleEdit(expense)} aria-label={`${t('common:edit')} ${expense.name}`} className="text-gray-400 hover:text-blue-500 mr-2 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"><Pencil size={16} aria-hidden="true" /></button>
                                                <button onClick={() => removeTransaction(expense.id)} aria-label={`${t('common:delete')} ${expense.name}`} className="text-gray-400 hover:text-error p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={16} aria-hidden="true" /></button>
                                            </td>
                                        </tr>
                                        {isExpanded && history.map(version => (
                                            <tr key={version.id} className="bg-gray-50/50 dark:bg-gray-800/20 text-gray-500 dark:text-gray-400">
                                                <td className="px-6 py-2 pl-16 text-sm">{version.validFrom || '—'} a {version.validTo || '—'}</td>
                                                <td className="px-6 py-2 text-right text-sm">{formatCurrency(version.amount, version.currency || 'DOP')}</td>
                                                <td className="px-6 py-2 text-right text-sm">{formatCurrency(calculateAnnualAmountV2(version, currencies))}</td>
                                                <td className="px-6 py-2 text-center text-sm">{version.frequency}</td>
                                                <td className="px-6 py-2 text-center">
                                                    <button onClick={() => removeTransaction(version.id)} aria-label={`${t('common:delete')} versión`} className="text-gray-400 hover:text-error p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={14} aria-hidden="true" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
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
                    title={raiseSource ? `Registrar cambio de monto: ${raiseSource.name}` : (editingId ? t('cashflow:edit_expense') : t('cashflow:new_expense'))}
                    onClose={cancelEdit}
                    onSave={handleAdd}
                    saveLabel={raiseSource ? 'Registrar' : t('common:save')}
                    color="red"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            {raiseSource && (
                                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                                    Nueva versión de <strong>{raiseSource.name}</strong>. La versión anterior se cerrará automáticamente en la fecha "Válido Desde" que indiques.
                                </div>
                            )}
                            <SectionCard title="Datos Básicos" icon={FileText}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputGroup label={t('common:concept')}>
                                        <input type="text" disabled={!!raiseSource} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 dark:text-white outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60" value={newExpense.name} onChange={e => setNewExpense({ ...newExpense, name: e.target.value })} autoFocus placeholder="Ej. Netflix" />
                                    </InputGroup>
                                    <InputGroup label={t('common:amount')}>
                                        <div className="flex gap-2">
                                            <input type="number" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 dark:text-white outline-none focus:ring-2 focus:ring-red-500" value={newExpense.amount || ''} onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })} placeholder="0.00" />
                                            <select className="p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 dark:text-white outline-none font-bold" value={newExpense.currency || 'DOP'} onChange={e => setNewExpense({ ...newExpense, currency: e.target.value as any })}>
                                                <option value="DOP">DOP</option><option value="USD">USD</option><option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                    </InputGroup>
                                </div>
                            </SectionCard>

                            <SectionCard title="Frecuencia y Vigencia" icon={CalendarClock}>
                                <div className="flex bg-white dark:bg-gray-700 p-1 rounded-xl mb-3">
                                    {['Mensual', 'Fijo', 'Variable', 'Anual'].map((freq) => (
                                        <button key={freq} onClick={() => setNewExpense({ ...newExpense, frequency: freq as any })} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newExpense.frequency === freq ? 'bg-gray-100 dark:bg-gray-600 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>{freq}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputGroup label={raiseSource ? 'Vigente Desde' : 'Válido Desde (Opcional)'}>
                                        <DatePicker value={newExpense.validFrom || ''} onChange={date => setNewExpense({ ...newExpense, validFrom: date })} />
                                    </InputGroup>
                                    <InputGroup label="Válido Hasta (Opcional)">
                                        <DatePicker value={newExpense.validTo || ''} onChange={date => setNewExpense({ ...newExpense, validTo: date })} />
                                    </InputGroup>
                                </div>
                            </SectionCard>
                        </div>
                        <div className="space-y-5">
                            <SummaryPreview draft={newExpense} currencies={currencies} accent="red" totalForShare={totalAnnual} />
                            <SectionCard title="Categoría" icon={Tag}>
                                <CategoryPicker
                                    categories={CATEGORIES}
                                    value={newExpense.category}
                                    onChange={id => setNewExpense({ ...newExpense, category: id })}
                                    recentIds={recentCategoryIds}
                                    groups={EXPENSE_CATEGORY_GROUPS}
                                    disabled={!!raiseSource}
                                    accent="red"
                                />
                            </SectionCard>
                        </div>
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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog" aria-modal="true" aria-labelledby="modal-title"
            onClick={onClose}
        >
            <div
                className="bg-card rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-border overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className={`px-8 py-5 border-b border-border flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0`}>
                    <h3 id="modal-title" className="text-xl font-bold text-text">{title}</h3>
                    <button onClick={onClose} aria-label={t('cancel')} className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"><X size={22} aria-hidden="true" /></button>
                </div>
                <div className="p-8 overflow-y-auto">{children}</div>
                <div className="px-8 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-border flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">{t('cancel')}</button>
                    <button onClick={onSave} className={`bg-${color}-600 hover:bg-${color}-700 text-white px-7 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2`}>
                        <Save size={18} aria-hidden="true" /> {saveLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
