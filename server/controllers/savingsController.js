import { SavingsGoal, SavingsContribution, Account, toMinorUnits, fromMinorUnits, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

// ========================================
// GET /api/finanza/savings-goals
// List all savings goals for a user
// ========================================
export const getSavingsGoals = async (req, res) => {
    try {
        const { userId, activeOnly } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const where = { userId };
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
        const {
            userId,
            name,
            targetAmount,
            targetDate,
            linkedAccountId,
            currency = 'DOP',
            icon,
            color,
            notes
        } = req.body;

        if (!userId || !name || !targetAmount) {
            return res.status(400).json({
                error: 'userId, name, and targetAmount are required'
            });
        }

        // Calculate initial amount from linked account if provided
        let initialAmount = 0;
        if (linkedAccountId) {
            const account = await Account.findByPk(linkedAccountId);
            if (account) {
                initialAmount = account.currentBalanceMinor;
            }
        }

        const goal = await SavingsGoal.create({
            userId,
            name,
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

        const goal = await SavingsGoal.findByPk(id);
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

        const goal = await SavingsGoal.findByPk(id);
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

        if (!amount) {
            await t.rollback();
            return res.status(400).json({ error: 'amount is required' });
        }

        const goal = await SavingsGoal.findByPk(id, { transaction: t });
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

        const goal = await SavingsGoal.findByPk(id, {
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
            // Calculate average monthly contribution
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
        const { userId, month } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // This would require integration with the ledger
        // For now, return a placeholder
        res.json({
            month: month || new Date().toISOString().slice(0, 7),
            totalIncome: 0,
            totalExpense: 0,
            totalSaved: 0,
            savingsRate: 0,
            message: 'Integrate with ledger for actual calculations'
        });
    } catch (error) {
        console.error('[SavingsGoals] Error calculating rate:', error);
        res.status(500).json({ error: error.message });
    }
};
