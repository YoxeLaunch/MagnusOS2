import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    ArrowUpCircle,
    ArrowDownCircle,
    ArrowRightLeft,
    Filter,
    Search,
    Calendar,
    Check,
    Clock,
    CheckCircle2,
    MoreVertical,
    Trash2,
    Edit2
} from 'lucide-react';
import { ledgerApi, LedgerTransaction, LedgerFilters, transfersApi } from '../api/finanzaApi';
import { formatCurrency } from '../utils/calculations';
import { useAuth } from '../../../shared/context/AuthContext';

// ========================================
// Transaction Row Component
// ========================================
const TransactionRow: React.FC<{
    tx: LedgerTransaction;
    onStatusChange: (id: string, status: 'pending' | 'cleared' | 'reconciled') => void;
    onDelete: (id: string) => void;
}> = ({ tx, onStatusChange, onDelete }) => {
    const [showMenu, setShowMenu] = useState(false);

    // Calculate net amount (first line with account is usually the "main" one)
    const mainLine = tx.lines[0];
    const amount = mainLine?.amount || 0;
    const isIncome = tx.type === 'income';
    const isTransfer = tx.type === 'transfer';
    const isExpense = tx.type === 'expense';

    const statusIcons = {
        pending: <Clock className="w-4 h-4 text-yellow-500" />,
        cleared: <Check className="w-4 h-4 text-blue-500" />,
        reconciled: <CheckCircle2 className="w-4 h-4 text-green-500" />
    };

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-700',
        cleared: 'bg-blue-100 text-blue-700',
        reconciled: 'bg-green-100 text-green-700'
    };

    return (
        <tr className="hover:bg-muted/50 transition-colors group">
            {/* Date */}
            <td className="px-4 py-3 text-sm text-muted-foreground">
                {new Date(tx.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}
            </td>

            {/* Payee / Description */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isIncome ? 'bg-green-100 dark:bg-green-900/30' :
                            isTransfer ? 'bg-blue-100 dark:bg-blue-900/30' :
                                'bg-red-100 dark:bg-red-900/30'
                        }`}>
                        {isIncome ? <ArrowUpCircle className="w-4 h-4 text-green-600" /> :
                            isTransfer ? <ArrowRightLeft className="w-4 h-4 text-blue-600" /> :
                                <ArrowDownCircle className="w-4 h-4 text-red-600" />}
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{tx.payeeName || tx.memo || 'Sin descripción'}</p>
                        {tx.memo && tx.payeeName && (
                            <p className="text-xs text-muted-foreground">{tx.memo}</p>
                        )}
                    </div>
                </div>
            </td>

            {/* Account */}
            <td className="px-4 py-3 text-sm">
                {mainLine?.account?.name || 'N/A'}
            </td>

            {/* Category */}
            <td className="px-4 py-3 text-sm">
                {isTransfer ? (
                    <span className="text-muted-foreground italic">Transferencia</span>
                ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${mainLine?.category?.color ? `bg-[${mainLine.category.color}]/10 text-[${mainLine.category.color}]` : 'bg-muted'
                        }`}>
                        {mainLine?.category?.name || 'Sin categoría'}
                    </span>
                )}
            </td>

            {/* Status */}
            <td className="px-4 py-3">
                <button
                    onClick={() => {
                        const next = tx.status === 'pending' ? 'cleared' :
                            tx.status === 'cleared' ? 'reconciled' : 'pending';
                        onStatusChange(tx.id, next);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${statusColors[tx.status]}`}
                >
                    {statusIcons[tx.status]}
                    <span className="capitalize">{tx.status}</span>
                </button>
            </td>

            {/* Amount */}
            <td className={`px-4 py-3 text-right font-semibold ${isIncome ? 'text-green-600' :
                    isTransfer ? 'text-blue-600' :
                        'text-red-600'
                }`}>
                {isIncome || (isTransfer && amount > 0) ? '+' : ''}
                {formatCurrency(Math.abs(amount))}
            </td>

            {/* Actions */}
            <td className="px-4 py-3 text-center">
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-8 bg-popover border border-border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                            <button
                                onClick={() => { onDelete(tx.id); setShowMenu(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
};

// ========================================
// Quick Transfer Modal
// ========================================
const TransferModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { fromAccountId: string; toAccountId: string; amount: number; memo?: string }) => void;
    accounts: Array<{ id: string; name: string }>;
}> = ({ isOpen, onClose, onSave, accounts }) => {
    const [form, setForm] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        memo: ''
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <ArrowRightLeft className="text-blue-500" /> Nueva Transferencia
                </h2>

                <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Desde</label>
                        <select
                            value={form.fromAccountId}
                            onChange={e => setForm({ ...form, fromAccountId: e.target.value })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                            required
                        >
                            <option value="">Seleccionar cuenta</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Hacia</label>
                        <select
                            value={form.toAccountId}
                            onChange={e => setForm({ ...form, toAccountId: e.target.value })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                            required
                        >
                            <option value="">Seleccionar cuenta</option>
                            {accounts.filter(a => a.id !== form.fromAccountId).map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Monto</label>
                        <input
                            type="number"
                            step="0.01"
                            value={form.amount}
                            onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Nota (opcional)</label>
                        <input
                            type="text"
                            value={form.memo}
                            onChange={e => setForm({ ...form, memo: e.target.value })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                            placeholder="Ej: Ahorro mensual"
                        />
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg">
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                            Transferir
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ========================================
// Main Ledger Page
// ========================================
export const Ledger: React.FC = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);

    // Filters
    const [filters, setFilters] = useState<LedgerFilters>({
        userId: '',
        limit: 50
    });
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Load transactions
    const loadTransactions = async () => {
        if (!user?.username) return;
        try {
            const queryFilters: LedgerFilters = {
                userId: user.username,
                from: dateRange.from,
                to: dateRange.to,
                limit: 100
            };
            if (typeFilter !== 'all') queryFilters.type = typeFilter;

            const result = await ledgerApi.getTransactions(queryFilters);
            setTransactions(result.data);
        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load accounts
    const loadAccounts = async () => {
        if (!user?.username) return;
        try {
            const res = await fetch(`/api/finanza/accounts?userId=${user.username}`);
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, [user?.username]);

    useEffect(() => {
        loadTransactions();
    }, [user?.username, dateRange, typeFilter]);

    // Handlers
    const handleStatusChange = async (id: string, status: 'pending' | 'cleared' | 'reconciled') => {
        try {
            await ledgerApi.updateStatus(id, status);
            setTransactions(txs => txs.map(tx => tx.id === id ? { ...tx, status } : tx));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta transacción?')) return;
        try {
            await ledgerApi.deleteTransaction(id);
            setTransactions(txs => txs.filter(tx => tx.id !== id));
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    };

    const handleTransfer = async (data: { fromAccountId: string; toAccountId: string; amount: number; memo?: string }) => {
        if (!user?.username) return;
        try {
            await transfersApi.create({
                userId: user.username,
                date: new Date().toISOString().split('T')[0],
                ...data
            });
            await loadTransactions();
            await loadAccounts();
            setShowTransferModal(false);
        } catch (error) {
            console.error('Error creating transfer:', error);
            alert('Error al crear transferencia');
        }
    };

    // Filter by search term
    const filteredTransactions = useMemo(() => {
        if (!searchTerm) return transactions;
        const term = searchTerm.toLowerCase();
        return transactions.filter(tx =>
            tx.payeeName?.toLowerCase().includes(term) ||
            tx.memo?.toLowerCase().includes(term) ||
            tx.lines.some(l => l.category?.name?.toLowerCase().includes(term))
        );
    }, [transactions, searchTerm]);

    // Summary calculations
    const summary = useMemo(() => {
        return filteredTransactions.reduce((acc, tx) => {
            const mainAmount = tx.lines[0]?.amount || 0;
            if (tx.type === 'income') acc.income += Math.abs(mainAmount);
            else if (tx.type === 'expense') acc.expense += Math.abs(mainAmount);
            // transfers don't affect cashflow
            return acc;
        }, { income: 0, expense: 0 });
    }, [filteredTransactions]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Libro Mayor</h1>
                    <p className="text-muted-foreground">Registro de transacciones reales</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowTransferModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        <ArrowRightLeft className="w-4 h-4" /> Transferir
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                        <ArrowUpCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Ingresos</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.income)}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                        <ArrowDownCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Gastos</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.expense)}</p>
                </div>
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground">Flujo Neto</span>
                    </div>
                    <p className={`text-2xl font-bold ${summary.income - summary.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(summary.income - summary.expense)}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                {/* Date Range */}
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <input
                        type="date"
                        value={dateRange.from}
                        onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
                        className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm"
                    />
                    <span className="text-muted-foreground">—</span>
                    <input
                        type="date"
                        value={dateRange.to}
                        onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
                        className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm"
                    />
                </div>

                {/* Type Filter */}
                <div className="flex bg-muted p-1 rounded-lg">
                    {(['all', 'income', 'expense', 'transfer'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${typeFilter === type ? 'bg-card shadow-sm' : 'text-muted-foreground'
                                }`}
                        >
                            {type === 'all' ? 'Todos' :
                                type === 'income' ? 'Ingresos' :
                                    type === 'expense' ? 'Gastos' : 'Transferencias'}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-input border border-border rounded-lg text-sm"
                    />
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr className="text-xs uppercase text-muted-foreground font-semibold">
                                <th className="px-4 py-3 text-left">Fecha</th>
                                <th className="px-4 py-3 text-left">Descripción</th>
                                <th className="px-4 py-3 text-left">Cuenta</th>
                                <th className="px-4 py-3 text-left">Categoría</th>
                                <th className="px-4 py-3 text-left">Estado</th>
                                <th className="px-4 py-3 text-right">Monto</th>
                                <th className="px-4 py-3 text-center w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                        No hay transacciones en este período
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map(tx => (
                                    <TransactionRow
                                        key={tx.id}
                                        tx={tx}
                                        onStatusChange={handleStatusChange}
                                        onDelete={handleDelete}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transfer Modal */}
            <TransferModal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                onSave={handleTransfer}
                accounts={accounts}
            />
        </div>
    );
};

export default Ledger;
