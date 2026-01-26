import React, { useState, useEffect } from 'react';
import {
    Plus,
    Wallet,
    Building2,
    PiggyBank,
    CreditCard,
    TrendingUp,
    Receipt,
    MoreVertical,
    Archive,
    Edit2,
    ChevronRight
} from 'lucide-react';
import { Account, accountsApi } from '../api/finanzaApi';
import { formatCurrency } from '../utils/calculations';
import { useAuth } from '../../../shared/context/AuthContext';

// Account type icons and colors
const ACCOUNT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    cash: { icon: Wallet, color: 'text-green-500', label: 'Efectivo' },
    checking: { icon: Building2, color: 'text-blue-500', label: 'Cuenta Corriente' },
    savings: { icon: PiggyBank, color: 'text-emerald-500', label: 'Ahorros' },
    credit_card: { icon: CreditCard, color: 'text-orange-500', label: 'Tarjeta de Crédito' },
    investment: { icon: TrendingUp, color: 'text-purple-500', label: 'Inversión' },
    loan: { icon: Receipt, color: 'text-red-500', label: 'Préstamo' }
};

interface AccountCardProps {
    account: Account;
    onEdit: (account: Account) => void;
    onArchive: (id: string) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onEdit, onArchive }) => {
    const [showMenu, setShowMenu] = useState(false);
    const config = ACCOUNT_TYPE_CONFIG[account.type] || ACCOUNT_TYPE_CONFIG.checking;
    const Icon = config.icon;

    const isNegative = account.currentBalance < 0;
    const isCredit = account.type === 'credit_card' || account.type === 'loan';

    return (
        <div className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-all group">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-opacity-10 ${config.color.replace('text-', 'bg-')}`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div>
                        <h3 className="font-medium text-foreground">{account.name}</h3>
                        <p className="text-xs text-muted-foreground">
                            {config.label}
                            {account.institution && ` • ${account.institution}`}
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-8 bg-popover border border-border rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                            <button
                                onClick={() => { onEdit(account); setShowMenu(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" /> Editar
                            </button>
                            <button
                                onClick={() => { onArchive(account.id); setShowMenu(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                            >
                                <Archive className="w-4 h-4" /> Archivar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4">
                <p className={`text-2xl font-bold ${isNegative && !isCredit ? 'text-destructive' : 'text-foreground'}`}>
                    {formatCurrency(Math.abs(account.currentBalance), account.currency)}
                    {isCredit && account.currentBalance > 0 && (
                        <span className="text-xs font-normal text-muted-foreground ml-1">(deuda)</span>
                    )}
                </p>
            </div>
        </div>
    );
};

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (account: Partial<Account>) => void;
    account?: Account | null;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSave, account }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'checking' as Account['type'],
        currency: 'DOP',
        institution: '',
        openingBalance: 0,
        notes: ''
    });

    useEffect(() => {
        if (account) {
            setFormData({
                name: account.name,
                type: account.type,
                currency: account.currency,
                institution: account.institution || '',
                openingBalance: account.openingBalance,
                notes: account.notes || ''
            });
        } else {
            setFormData({
                name: '',
                type: 'checking',
                currency: 'DOP',
                institution: '',
                openingBalance: 0,
                notes: ''
            });
        }
    }, [account, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold mb-4">
                    {account ? 'Editar Cuenta' : 'Nueva Cuenta'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary"
                            placeholder="Ej: Banco Popular"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Tipo</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as Account['type'] })}
                                className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                            >
                                {Object.entries(ACCOUNT_TYPE_CONFIG).map(([type, config]) => (
                                    <option key={type} value={type}>{config.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Moneda</label>
                            <select
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                            >
                                <option value="DOP">DOP (RD$)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Institución (opcional)</label>
                        <input
                            type="text"
                            value={formData.institution}
                            onChange={e => setFormData({ ...formData, institution: e.target.value })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                            placeholder="Ej: Banco Popular"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Balance Inicial</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.openingBalance}
                            onChange={e => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                        />
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                        >
                            {account ? 'Guardar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ========================================
// Main Accounts Page
// ========================================
export const Accounts: React.FC = () => {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    const loadAccounts = async () => {
        if (!user?.username) return;
        try {
            const data = await accountsApi.getAll(user.username);
            setAccounts(data);
        } catch (error) {
            console.error('Error loading accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, [user?.username]);

    const handleSave = async (accountData: Partial<Account>) => {
        if (!user?.username) return;

        try {
            if (editingAccount) {
                await accountsApi.update(editingAccount.id, accountData);
            } else {
                await accountsApi.create({ ...accountData, userId: user.username });
            }
            await loadAccounts();
            setShowModal(false);
            setEditingAccount(null);
        } catch (error) {
            console.error('Error saving account:', error);
            alert('Error al guardar la cuenta');
        }
    };

    const handleArchive = async (id: string) => {
        if (!confirm('¿Archivar esta cuenta?')) return;
        try {
            await accountsApi.archive(id);
            await loadAccounts();
        } catch (error) {
            console.error('Error archiving account:', error);
        }
    };

    const handleEdit = (account: Account) => {
        setEditingAccount(account);
        setShowModal(true);
    };

    // Calculate totals by currency
    const totals = accounts.reduce((acc, account) => {
        const currency = account.currency;
        if (!acc[currency]) acc[currency] = 0;

        // For credit/loans, balance represents debt
        const isDebt = account.type === 'credit_card' || account.type === 'loan';
        acc[currency] += isDebt ? -account.currentBalance : account.currentBalance;

        return acc;
    }, {} as Record<string, number>);

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Cuentas</h1>
                    <p className="text-muted-foreground">Gestiona tus cuentas y ve tus balances</p>
                </div>
                <button
                    onClick={() => { setEditingAccount(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Cuenta
                </button>
            </div>

            {/* Net Worth Summary */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6">
                <p className="text-sm text-muted-foreground mb-1">Patrimonio Neto Total</p>
                <div className="flex flex-wrap gap-4">
                    {Object.entries(totals).map(([currency, amount]) => (
                        <div key={currency} className="flex items-baseline gap-1">
                            <span className={`text-3xl font-bold ${amount < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                {formatCurrency(amount, currency)}
                            </span>
                            <span className="text-sm text-muted-foreground">{currency}</span>
                        </div>
                    ))}
                    {Object.keys(totals).length === 0 && (
                        <span className="text-3xl font-bold text-muted-foreground">$0.00</span>
                    )}
                </div>
            </div>

            {/* Accounts Grid */}
            {accounts.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                    <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-lg font-medium mb-1">No tienes cuentas</h3>
                    <p className="text-muted-foreground mb-4">Crea tu primera cuenta para empezar a registrar transacciones</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                    >
                        Crear Cuenta
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map(account => (
                        <AccountCard
                            key={account.id}
                            account={account}
                            onEdit={handleEdit}
                            onArchive={handleArchive}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            <AccountModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingAccount(null); }}
                onSave={handleSave}
                account={editingAccount}
            />
        </div>
    );
};

export default Accounts;
