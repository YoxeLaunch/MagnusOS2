import React, { useState, useEffect } from 'react';
import {
    PiggyBank,
    Plus,
    Target,
    Calendar,
    TrendingUp,
    MoreVertical,
    Edit2,
    Trash2,
    Check,
    ChevronRight,
    Wallet
} from 'lucide-react';
import { formatCurrency } from '../utils/calculations';
import { useAuth } from '../../../shared/context/AuthContext';

// API Client
const API_BASE = '/api/finanza';

interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    progress: number;
    currency: string;
    targetDate?: string;
    monthlyNeeded: number;
    isCompleted: boolean;
    icon?: string;
    color?: string;
}

// ========================================
// Goal Card Component
// ========================================
const GoalCard: React.FC<{
    goal: SavingsGoal;
    onEdit: () => void;
    onDelete: () => void;
    onContribute: () => void;
}> = ({ goal, onEdit, onDelete, onContribute }) => {
    const [showMenu, setShowMenu] = useState(false);

    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const progressColor = goal.isCompleted
        ? 'bg-green-500'
        : goal.progress > 75
            ? 'bg-emerald-500'
            : goal.progress > 50
                ? 'bg-yellow-500'
                : 'bg-primary';

    return (
        <div className={`bg-card border ${goal.isCompleted ? 'border-green-500/30' : 'border-border'} rounded-2xl p-5 hover:shadow-lg transition-all`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${goal.isCompleted ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                        {goal.isCompleted ? (
                            <Check className="w-6 h-6 text-green-500" />
                        ) : (
                            <Target className="w-6 h-6 text-primary" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{goal.name}</h3>
                        {goal.targetDate && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Meta: {new Date(goal.targetDate).toLocaleDateString('es-DO', { month: 'short', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1.5 rounded-lg hover:bg-muted"
                    >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-8 bg-popover border border-border rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                            <button
                                onClick={() => { onEdit(); setShowMenu(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" /> Editar
                            </button>
                            <button
                                onClick={() => { onDelete(); setShowMenu(false); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className={`font-semibold ${goal.isCompleted ? 'text-green-500' : ''}`}>
                        {goal.progress.toFixed(1)}%
                    </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                        className={`h-full ${progressColor} transition-all duration-500`}
                        style={{ width: `${Math.min(100, goal.progress)}%` }}
                    />
                </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-xs text-muted-foreground">Ahorrado</p>
                    <p className="text-lg font-bold text-foreground">
                        {formatCurrency(goal.currentAmount, goal.currency)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="text-lg font-bold text-muted-foreground">
                        {formatCurrency(goal.targetAmount, goal.currency)}
                    </p>
                </div>
            </div>

            {/* Footer */}
            {!goal.isCompleted && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                        <p className="text-xs text-muted-foreground">Para alcanzar la meta</p>
                        <p className="text-sm font-medium">
                            {formatCurrency(goal.monthlyNeeded, goal.currency)}/mes
                        </p>
                    </div>
                    <button
                        onClick={onContribute}
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                    >
                        + Aportar
                    </button>
                </div>
            )}

            {goal.isCompleted && (
                <div className="pt-3 border-t border-green-500/20 text-center">
                    <p className="text-green-500 font-medium">🎉 ¡Meta alcanzada!</p>
                </div>
            )}
        </div>
    );
};

// ========================================
// Create/Edit Modal
// ========================================
const GoalModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (goal: Partial<SavingsGoal>) => void;
    goal?: SavingsGoal | null;
}> = ({ isOpen, onClose, onSave, goal }) => {
    const [formData, setFormData] = useState({
        name: '',
        targetAmount: 0,
        targetDate: '',
        currency: 'DOP'
    });

    useEffect(() => {
        if (goal) {
            setFormData({
                name: goal.name,
                targetAmount: goal.targetAmount,
                targetDate: goal.targetDate || '',
                currency: goal.currency
            });
        } else {
            setFormData({ name: '', targetAmount: 0, targetDate: '', currency: 'DOP' });
        }
    }, [goal, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold mb-4">
                    {goal ? 'Editar Meta' : 'Nueva Meta de Ahorro'}
                </h2>

                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre de la Meta</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                            placeholder="Ej: Fondo de emergencia"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Monto Meta</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.targetAmount}
                                onChange={e => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Moneda</label>
                            <select
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                            >
                                <option value="DOP">DOP</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Fecha Objetivo (opcional)</label>
                        <input
                            type="date"
                            value={formData.targetDate}
                            onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
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
                            {goal ? 'Guardar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ========================================
// Contribute Modal
// ========================================
const ContributeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (amount: number) => void;
    goal: SavingsGoal | null;
}> = ({ isOpen, onClose, onSave, goal }) => {
    const [amount, setAmount] = useState(0);

    if (!isOpen || !goal) return null;

    const remaining = goal.targetAmount - goal.currentAmount;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4">
                <h2 className="text-xl font-bold mb-2">Aportar a {goal.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Restante: {formatCurrency(remaining, goal.currency)}
                </p>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Monto a aportar</label>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg text-lg"
                        autoFocus
                    />
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2 mb-4">
                    {[goal.monthlyNeeded, remaining / 2, remaining].filter(a => a > 0).slice(0, 3).map((quickAmount, i) => (
                        <button
                            key={i}
                            onClick={() => setAmount(Math.round(quickAmount * 100) / 100)}
                            className="flex-1 px-2 py-1 text-xs bg-muted rounded-lg hover:bg-muted/80"
                        >
                            {formatCurrency(quickAmount, goal.currency)}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-border rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(amount)}
                        disabled={amount <= 0}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                        Aportar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ========================================
// Main Savings Page
// ========================================
export const Savings: React.FC = () => {
    const { user } = useAuth();
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showContributeModal, setShowContributeModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
    const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);

    const loadGoals = async () => {
        if (!user?.username) return;
        try {
            const res = await fetch(`${API_BASE}/savings-goals?userId=${user.username}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setGoals(data);
        } catch (error) {
            console.error('Error loading goals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGoals();
    }, [user?.username]);

    const handleSave = async (goalData: Partial<SavingsGoal>) => {
        if (!user?.username) return;

        try {
            const url = editingGoal
                ? `${API_BASE}/savings-goals/${editingGoal.id}`
                : `${API_BASE}/savings-goals`;

            const res = await fetch(url, {
                method: editingGoal ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...goalData, userId: user.username })
            });

            if (!res.ok) throw new Error('Failed to save');

            await loadGoals();
            setShowModal(false);
            setEditingGoal(null);
        } catch (error) {
            console.error('Error saving goal:', error);
            alert('Error al guardar la meta');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta meta de ahorro?')) return;
        try {
            await fetch(`${API_BASE}/savings-goals/${id}`, { method: 'DELETE' });
            await loadGoals();
        } catch (error) {
            console.error('Error deleting goal:', error);
        }
    };

    const handleContribute = async (amount: number) => {
        if (!contributingGoal) return;
        try {
            const res = await fetch(`${API_BASE}/savings-goals/${contributingGoal.id}/contribute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });
            if (!res.ok) throw new Error('Failed to contribute');
            await loadGoals();
            setShowContributeModal(false);
            setContributingGoal(null);
        } catch (error) {
            console.error('Error contributing:', error);
        }
    };

    // Stats
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const completedCount = goals.filter(g => g.isCompleted).length;
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

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
                    <h1 className="text-2xl font-bold">Metas de Ahorro</h1>
                    <p className="text-muted-foreground">Define y alcanza tus objetivos financieros</p>
                </div>
                <button
                    onClick={() => { setEditingGoal(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Meta
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <PiggyBank className="w-5 h-5 text-primary" />
                        <span className="text-sm text-muted-foreground">Total Ahorrado</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(totalSaved, 'DOP')}</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Meta Total</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(totalTarget, 'DOP')}</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Progreso General</span>
                    </div>
                    <p className="text-2xl font-bold">{overallProgress.toFixed(1)}%</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-muted-foreground">Completadas</span>
                    </div>
                    <p className="text-2xl font-bold">{completedCount} / {goals.length}</p>
                </div>
            </div>

            {/* Goals Grid */}
            {goals.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                    <PiggyBank className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-lg font-medium mb-1">No tienes metas de ahorro</h3>
                    <p className="text-muted-foreground mb-4">Crea tu primera meta para empezar a ahorrar</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                    >
                        Crear Meta
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goals.map(goal => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            onEdit={() => { setEditingGoal(goal); setShowModal(true); }}
                            onDelete={() => handleDelete(goal.id)}
                            onContribute={() => { setContributingGoal(goal); setShowContributeModal(true); }}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            <GoalModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingGoal(null); }}
                onSave={handleSave}
                goal={editingGoal}
            />
            <ContributeModal
                isOpen={showContributeModal}
                onClose={() => { setShowContributeModal(false); setContributingGoal(null); }}
                onSave={handleContribute}
                goal={contributingGoal}
            />
        </div>
    );
};

export default Savings;
