import { SavingsGoal, SavingsContribution, Account, DailyTransaction, toMinorUnits, fromMinorUnits, sequelize } from '../models/index.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import { Op } from 'sequelize';
import { LedgerReadService } from '../services/ledgerReadService.js';

// ========================================
// GET /api/finanza/savings-goals
// List all savings goals for a user
// ========================================
export const getSavingsGoals = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.query.userId);
        const { activeOnly } = req.query;

        const where = { userId: effectiveUserId };
        if (activeOnly === 'true') {
            where.isActive = true;
        }

        const goals = await SavingsGoal.findAll({
            where,
            include: [
                { model: Account, as: 'linkedAccount', attributes: ['id', 'name', 'currentBalanceMinor'] },
                { model: SavingsContribution, as: 'contributions', limit: 5, order: [['date', 'DESC']] }
            ],
            order: [['created_at', 'DESC']]
        });

        // Format response with calculated fields
        const formatted = goals.map(goal => {
            const json = goal.toJSON();
            const targetAmount = fromMinorUnits(json.targetAmountMinor);
            const currentAmount = fromMinorUnits(json.currentAmountMinor);
            const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

            // Calculate monthly contribution needed
            let monthlyNeeded = 0;
            if (json.targetDate && !json.isCompleted) {
                const today = new Date();
                const target = new Date(json.targetDate);
                const monthsLeft = Math.max(1, (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth()));
                const remaining = targetAmount - currentAmount;
                monthlyNeeded = remaining > 0 ? remaining / monthsLeft : 0;
            }

            return {
                ...json,
                targetAmount,
                currentAmount,
                progress: Math.min(100, Math.round(progress * 10) / 10),
                monthlyNeeded: Math.round(monthlyNeeded * 100) / 100,
                contributions: json.contributions?.map(c => ({
                    ...c,
                    amount: fromMinorUnits(c.amountMinor)
                }))
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('[SavingsGoals] Error fetching goals:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// POST /api/finanza/savings-goals
// Create a new savings goal
// ========================================
export const createSavingsGoal = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.body.userId);
        const {
            name,
            targetAmount,
            targetDate,
            linkedAccountId,
            currency = 'DOP',
            icon,
            color,
            notes
        } = req.body;

        if (!name || targetAmount === undefined) {
            return res.status(400).json({
                error: 'name and targetAmount are required'
            });
        }

        // Calculate initial amount from linked account if provided and verify ownership
        let initialAmount = 0;
        if (linkedAccountId) {
            const account = await Account.findByPk(linkedAccountId);
            if (account) {
                const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';
                if (!isAdmin && account.userId !== effectiveUserId) {
                    return res.status(403).json({ error: 'La cuenta vinculada no pertenece a este usuario' });
                }
                initialAmount = account.currentBalanceMinor;
            }
        }

        const goal = await SavingsGoal.create({
            userId: effectiveUserId,
            name: name.trim(),
            targetAmountMinor: toMinorUnits(targetAmount),
            currentAmountMinor: initialAmount,
            currency,
            targetDate,
            linkedAccountId,
            icon,
            color,
            notes,
            isActive: true,
            isCompleted: false
        });

        res.status(201).json({
            ...goal.toJSON(),
            targetAmount,
            currentAmount: fromMinorUnits(initialAmount),
            progress: 0
        });
    } catch (error) {
        console.error('[SavingsGoals] Error creating goal:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// PATCH /api/finanza/savings-goals/:id
// Update a savings goal
// ========================================
export const updateSavingsGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const effectiveUserId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) where.userId = effectiveUserId;

        const goal = await SavingsGoal.findOne({ where });
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        // Convert amount if provided
        if (updates.targetAmount !== undefined) {
            updates.targetAmountMinor = toMinorUnits(updates.targetAmount);
            delete updates.targetAmount;
        }
        if (updates.currentAmount !== undefined) {
            updates.currentAmountMinor = toMinorUnits(updates.currentAmount);
            delete updates.currentAmount;
        }
        delete updates.userId;
        delete updates.id;

        await goal.update(updates);

        // Check if completed
        if (goal.currentAmountMinor >= goal.targetAmountMinor && !goal.isCompleted) {
            await goal.update({
                isCompleted: true,
                completedAt: new Date()
            });
        }

        res.json({
            ...goal.toJSON(),
            targetAmount: fromMinorUnits(goal.targetAmountMinor),
            currentAmount: fromMinorUnits(goal.currentAmountMinor),
            progress: Math.min(100, (fromMinorUnits(goal.currentAmountMinor) / fromMinorUnits(goal.targetAmountMinor)) * 100)
        });
    } catch (error) {
        console.error('[SavingsGoals] Error updating goal:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// DELETE /api/finanza/savings-goals/:id
// Delete a savings goal
// ========================================
export const deleteSavingsGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const effectiveUserId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) where.userId = effectiveUserId;

        const goal = await SavingsGoal.findOne({ where });
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        await goal.destroy();
        res.status(204).send();
    } catch (error) {
        console.error('[SavingsGoals] Error deleting goal:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// POST /api/finanza/savings-goals/:id/contribute
// Add a contribution to a goal
// ========================================
export const addContribution = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { amount, date, notes, transactionId } = req.body;
        const effectiveUserId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            await t.rollback();
            return res.status(400).json({ error: 'amount debe ser un número positivo' });
        }

        const where = { id };
        if (!isAdmin) where.userId = effectiveUserId;

        const goal = await SavingsGoal.findOne({ where, transaction: t, lock: t.LOCK.UPDATE });
        if (!goal) {
            await t.rollback();
            return res.status(404).json({ error: 'Goal not found' });
        }

        // Create contribution record
        const contribution = await SavingsContribution.create({
            goalId: id,
            transactionId,
            amountMinor: toMinorUnits(amount),
            date: date || new Date().toISOString().split('T')[0],
            notes
        }, { transaction: t });

        // Update goal's current amount
        const newAmount = goal.currentAmountMinor + toMinorUnits(amount);
        const isCompleted = newAmount >= goal.targetAmountMinor;

        await goal.update({
            currentAmountMinor: newAmount,
            isCompleted,
            completedAt: isCompleted && !goal.isCompleted ? new Date() : goal.completedAt
        }, { transaction: t });

        await t.commit();

        res.status(201).json({
            contribution: {
                ...contribution.toJSON(),
                amount
            },
            goal: {
                currentAmount: fromMinorUnits(newAmount),
                progress: Math.min(100, (newAmount / goal.targetAmountMinor) * 100),
                isCompleted
            }
        });
    } catch (error) {
        await t.rollback();
        console.error('[SavingsGoals] Error adding contribution:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// GET /api/finanza/savings-goals/:id/progress
// Get detailed progress for a goal
// ========================================
export const getGoalProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const effectiveUserId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) where.userId = effectiveUserId;

        const goal = await SavingsGoal.findOne({
            where,
            include: [
                { model: Account, as: 'linkedAccount' },
                { model: SavingsContribution, as: 'contributions', order: [['date', 'DESC']] }
            ]
        });

        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        const targetAmount = fromMinorUnits(goal.targetAmountMinor);
        const currentAmount = fromMinorUnits(goal.currentAmountMinor);
        const remaining = Math.max(0, targetAmount - currentAmount);
        const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

        // Calculate projections
        let projectedDate = null;
        let monthlyNeeded = 0;

        if (goal.contributions && goal.contributions.length >= 2) {
            const contributions = goal.contributions.map(c => ({
                date: new Date(c.date),
                amount: fromMinorUnits(c.amountMinor)
            }));

            const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0);
            const firstDate = new Date(Math.min(...contributions.map(c => c.date.getTime())));
            const lastDate = new Date(Math.max(...contributions.map(c => c.date.getTime())));
            const monthsElapsed = Math.max(1, (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth()));

            const avgMonthly = totalContributed / monthsElapsed;

            if (avgMonthly > 0 && remaining > 0) {
                const monthsToGo = remaining / avgMonthly;
                const projDate = new Date();
                projDate.setMonth(projDate.getMonth() + Math.ceil(monthsToGo));
                projectedDate = projDate.toISOString().split('T')[0];
            }
        }

        if (goal.targetDate && !goal.isCompleted) {
            const today = new Date();
            const target = new Date(goal.targetDate);
            const monthsLeft = Math.max(1, (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth()));
            monthlyNeeded = remaining > 0 ? remaining / monthsLeft : 0;
        }

        res.json({
            goalId: id,
            name: goal.name,
            targetAmount,
            currentAmount,
            remaining,
            progress: Math.round(progress * 10) / 10,
            isCompleted: goal.isCompleted,
            targetDate: goal.targetDate,
            projectedDate,
            monthlyNeeded: Math.round(monthlyNeeded * 100) / 100,
            contributionsCount: goal.contributions?.length || 0,
            recentContributions: goal.contributions?.slice(0, 5).map(c => ({
                date: c.date,
                amount: fromMinorUnits(c.amountMinor),
                notes: c.notes
            }))
        });
    } catch (error) {
        console.error('[SavingsGoals] Error getting progress:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// GET /api/finanza/savings-rate
// Calculate monthly savings rate
// ========================================
export const getSavingsRate = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.query.userId);
        const { month, source } = req.query;

        const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthStart = `${targetMonth}-01`;
        const monthEndDate = new Date(monthStart);
        monthEndDate.setMonth(monthEndDate.getMonth() + 1);
        const monthEnd = monthEndDate.toISOString().slice(0, 10);

        // Aportes a metas de ahorro del usuario
        const goalContributions = await SavingsContribution.findAll({
            include: [{ model: SavingsGoal, as: 'goal', where: { userId: effectiveUserId }, attributes: [] }],
            where: { date: { [Op.gte]: monthStart, [Op.lt]: monthEnd } }
        });
        const totalGoalContributions = goalContributions.reduce((sum, c) => sum + fromMinorUnits(c.amountMinor), 0);

        // Controlled Strangler Switch (Phase II):
        // By default use LedgerReadService unless source=legacy is explicitly requested
        if (source !== 'legacy') {
            const ledgerCashFlow = await LedgerReadService.getCashFlow({
                userId: effectiveUserId,
                startDate: monthStart,
                endDate: monthEnd
            });

            // Use ledger if transactions exist for that period or if ledger source was explicitly chosen
            if (ledgerCashFlow.transactionCount > 0 || source === 'ledger') {
                const totalIncome = ledgerCashFlow.totalIncome;
                const totalExpense = ledgerCashFlow.totalExpense;
                const totalInvested = ledgerCashFlow.totalInvested;
                const totalSaved = ledgerCashFlow.netCashFlow;
                const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;

                return res.json({
                    source: 'ledger',
                    month: targetMonth,
                    totalIncome,
                    totalExpense,
                    totalInvested,
                    totalSaved,
                    savingsRate: Math.round(savingsRate * 10) / 10,
                    totalGoalContributions
                });
            }
        }

        // Diagnostic or Unmigrated Fallback Mode: DailyTransaction
        const transactions = await DailyTransaction.findAll({
            where: {
                userId: effectiveUserId,
                date: { [Op.gte]: monthStart, [Op.lt]: monthEnd }
            }
        });

        let totalIncome = 0;
        let totalExpense = 0;
        let totalInvested = 0;
        transactions.forEach(t => {
            const amount = Number(t.amount) || 0;
            if (t.type === 'income') totalIncome += amount;
            else if (t.type === 'investment') totalInvested += amount;
            else totalExpense += amount;
        });

        const totalSaved = totalIncome - totalExpense - totalInvested;
        const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;

        res.json({
            source: 'legacy',
            month: targetMonth,
            totalIncome: Number(totalIncome.toFixed(2)),
            totalExpense: Number(totalExpense.toFixed(2)),
            totalInvested: Number(totalInvested.toFixed(2)),
            totalSaved: Number(totalSaved.toFixed(2)),
            savingsRate: Math.round(savingsRate * 10) / 10,
            totalGoalContributions
        });
    } catch (error) {
        console.error('[SavingsGoals] Error calculating rate:', error);
        res.status(500).json({ error: error.message });
    }
};


