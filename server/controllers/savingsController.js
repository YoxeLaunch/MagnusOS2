import { SavingsGoal, SavingsContribution, Account, DailyTransaction, LedgerTransaction, TransactionLine, toMinorUnitsBigInt, fromMinorUnits, sequelize } from '../models/index.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import { Op } from 'sequelize';
import { LedgerReadService } from '../services/ledgerReadService.js';

const savingsRateFromMinor = (savedMinor, incomeMinor) => {
    if (incomeMinor <= 0n) return 0;
    const tenths = savedMinor * 1000n / incomeMinor;
    if (tenths < BigInt(Number.MIN_SAFE_INTEGER) || tenths > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new RangeError('Savings rate exceeds JavaScript safe integer range');
    }
    return Number(tenths) / 10;
};

const progressFromMinor = (currentMinor, targetMinor, decimals = 2) => {
    if (targetMinor <= 0n || currentMinor <= 0n) return 0;
    if (currentMinor >= targetMinor) return 100;
    const factor = decimals === 1 ? 1000n : 10000n;
    return Number(currentMinor * factor / targetMinor) / (decimals === 1 ? 10 : 100);
};

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

        // Format response with calculated fields, deriving progress from linked account when attached
        const formatted = goals.map(goal => {
            const json = goal.toJSON();
            const activeMinor = goal.linkedAccount?.currentBalanceMinor != null ? goal.linkedAccount.currentBalanceMinor : json.currentAmountMinor;
            const targetAmount = fromMinorUnits(json.targetAmountMinor);
            const currentAmount = fromMinorUnits(activeMinor);
            const targetBig = BigInt(json.targetAmountMinor != null ? String(json.targetAmountMinor) : '0');
            const currentBig = BigInt(activeMinor != null ? String(activeMinor) : '0');
            const progress = progressFromMinor(currentBig, targetBig);
            const isCompleted = targetBig > 0n && currentBig >= targetBig;

            // Calculate monthly contribution needed
            let monthlyNeeded = 0;
            if (json.targetDate && !isCompleted) {
                const today = new Date();
                const target = new Date(json.targetDate);
                const monthsLeft = Math.max(1, (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth()));
                const remaining = targetAmount - currentAmount;
                monthlyNeeded = remaining > 0 ? remaining / monthsLeft : 0;
            }

            return {
                ...json,
                currentAmountMinor: activeMinor ? activeMinor.toString() : '0',
                targetAmount,
                currentAmount,
                progress,
                isCompleted,
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

        // Calculate initial amount from linked account if provided and strictly verify ownership
        let initialAmountMinor = 0n;
        if (linkedAccountId) {
            const account = await Account.findByPk(linkedAccountId);
            if (account) {
                if (account.userId !== effectiveUserId) {
                    return res.status(403).json({ error: 'La cuenta vinculada no pertenece a este usuario' });
                }
                initialAmountMinor = BigInt(account.currentBalanceMinor != null ? String(account.currentBalanceMinor) : '0');
            } else {
                return res.status(404).json({ error: 'Cuenta vinculada no encontrada' });
            }

            const existingLinkedGoal = await SavingsGoal.findOne({
                where: { linkedAccountId, isActive: true }
            });
            if (existingLinkedGoal) {
                return res.status(409).json({ error: 'Esta cuenta ya está vinculada a otra meta activa' });
            }
        }

        const targetMinor = toMinorUnitsBigInt(targetAmount);

        const goal = await SavingsGoal.create({
            userId: effectiveUserId,
            name: name.trim(),
            targetAmountMinor: targetMinor.toString(),
            currentAmountMinor: initialAmountMinor.toString(),
            currency,
            targetDate,
            linkedAccountId,
            icon,
            color,
            notes,
            isActive: true,
            isCompleted: targetMinor > 0n && initialAmountMinor >= targetMinor
        });

        const progress = progressFromMinor(initialAmountMinor, targetMinor);

        res.status(201).json({
            ...goal.toJSON(),
            targetAmount,
            currentAmount: fromMinorUnits(initialAmountMinor),
            progress
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
            updates.targetAmountMinor = toMinorUnitsBigInt(updates.targetAmount).toString();
            delete updates.targetAmount;
        }
        // Progress is derived from the linked account or validated ledger contributions.
        delete updates.currentAmount;
        delete updates.currentAmountMinor;
        delete updates.linkedAccountId;
        delete updates.userId;
        delete updates.id;

        await goal.update(updates);

        // Check if completed
        if (BigInt(String(goal.currentAmountMinor)) >= BigInt(String(goal.targetAmountMinor)) && !goal.isCompleted) {
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
        const { date, notes, transactionId } = req.body;
        const effectiveUserId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        if (!transactionId) {
            await t.rollback();
            return res.status(400).json({ error: 'transactionId de una transferencia ledger es obligatorio' });
        }

        const where = { id };
        if (!isAdmin) where.userId = effectiveUserId;

        const goal = await SavingsGoal.findOne({ where, transaction: t, lock: t.LOCK.UPDATE });
        if (!goal) {
            await t.rollback();
            return res.status(404).json({ error: 'Goal not found' });
        }

        if (!goal.linkedAccountId) {
            await t.rollback();
            return res.status(400).json({ error: 'La meta debe estar vinculada a una cuenta de ahorro' });
        }

        const ledgerTx = await LedgerTransaction.findOne({
            where: { id: transactionId, userId: goal.userId, type: 'transfer' },
            include: [{ model: TransactionLine, as: 'lines' }],
            transaction: t
        });
        if (!ledgerTx) {
            await t.rollback();
            return res.status(400).json({ error: 'La transferencia no existe o no pertenece al usuario' });
        }

        const destinationLine = ledgerTx.lines.find(line =>
            line.accountId === goal.linkedAccountId && BigInt(String(line.amountMinor)) > 0n
        );
        const accountLines = ledgerTx.lines.filter(line => line.accountId);
        if (!destinationLine || accountLines.length < 2 || ledgerTx.lines.some(line => !line.accountId)) {
            await t.rollback();
            return res.status(400).json({ error: 'La transacción no es una transferencia interna hacia la cuenta vinculada' });
        }

        const existingContribution = await SavingsContribution.findOne({
            where: { transactionId },
            transaction: t
        });
        if (existingContribution) {
            await t.rollback();
            return res.status(409).json({ error: 'Esta transferencia ya fue asignada a una contribución' });
        }

        const contribMinor = BigInt(String(destinationLine.amountMinor));

        // Create contribution record
        const contribution = await SavingsContribution.create({
            goalId: id,
            transactionId,
            amountMinor: contribMinor.toString(),
            date: date || new Date().toISOString().split('T')[0],
            notes
        }, { transaction: t });

        // The account balance is the canonical saved amount; do not add the same money to a second cache.
        const linkedAccount = await Account.findOne({
            where: { id: goal.linkedAccountId, userId: goal.userId },
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        const newAmountMinor = BigInt(linkedAccount.currentBalanceMinor != null ? String(linkedAccount.currentBalanceMinor) : '0');
        const targetAmountMinor = BigInt(goal.targetAmountMinor != null ? String(goal.targetAmountMinor) : '0');
        const isCompleted = targetAmountMinor > 0n && newAmountMinor >= targetAmountMinor;

        await goal.update({
            currentAmountMinor: newAmountMinor.toString(),
            isCompleted,
            completedAt: isCompleted && !goal.isCompleted ? new Date() : goal.completedAt
        }, { transaction: t });

        await t.commit();

        const progress = progressFromMinor(newAmountMinor, targetAmountMinor);

        res.status(201).json({
            contribution: {
                ...contribution.toJSON(),
                amount: fromMinorUnits(contribMinor)
            },
            goal: {
                currentAmount: fromMinorUnits(newAmountMinor),
                progress,
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

        const activeMinor = goal.linkedAccount?.currentBalanceMinor != null
            ? String(goal.linkedAccount.currentBalanceMinor)
            : String(goal.currentAmountMinor || '0');
        const targetMinor = String(goal.targetAmountMinor || '0');
        const targetAmount = fromMinorUnits(targetMinor);
        const currentAmount = fromMinorUnits(activeMinor);
        const remaining = Math.max(0, targetAmount - currentAmount);
        const targetBig = BigInt(targetMinor);
        const currentBig = BigInt(activeMinor);
        const progress = progressFromMinor(currentBig, targetBig, 1);
        const isCompleted = targetBig > 0n && currentBig >= targetBig;

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

        if (goal.targetDate && !isCompleted) {
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
            progress,
            isCompleted,
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
        const [year, monthNum] = targetMonth.split('-').map(Number);
        const lastDay = new Date(year, monthNum, 0).getDate();
        const monthStart = `${targetMonth}-01`;
        const monthEnd = `${targetMonth}-${String(lastDay).padStart(2, '0')}`;

        // Aportes a metas de ahorro del usuario
        const goalContributions = await SavingsContribution.findAll({
            include: [{ model: SavingsGoal, as: 'goal', where: { userId: effectiveUserId }, attributes: [] }],
            where: { date: { [Op.gte]: monthStart, [Op.lte]: monthEnd } }
        });
        const totalGoalContributionsMinor = goalContributions.reduce(
            (sum, contribution) => sum + BigInt(String(contribution.amountMinor ?? 0)),
            0n
        );
        const totalGoalContributions = fromMinorUnits(totalGoalContributionsMinor);

        // Controlled Strangler Switch:
        let useLedger = source === 'ledger';

        if (!useLedger && source !== 'legacy') {
            const comparison = await LedgerReadService.compareLegacyVsLedger({
                userId: effectiveUserId,
                startDate: monthStart,
                endDate: monthEnd
            });

            if (comparison.classification === 'EXACT_MATCH') {
                useLedger = true;
            } else if (comparison.legacy.transactionCount === 0 && comparison.ledger.transactionCount > 0) {
                useLedger = true;
            } else {
                useLedger = false;
            }
        }

        if (useLedger) {
            const ledgerCashFlow = await LedgerReadService.getCashFlow({
                userId: effectiveUserId,
                startDate: monthStart,
                endDate: monthEnd
            });

            const incomeMinor = BigInt(ledgerCashFlow.totalIncomeMinor);
            const expenseMinor = BigInt(ledgerCashFlow.totalExpenseMinor);
            const investedMinor = BigInt(ledgerCashFlow.totalInvestedMinor);
            const savedMinor = BigInt(ledgerCashFlow.netCashFlowMinor);
            const savingsRate = savingsRateFromMinor(savedMinor, incomeMinor);

            return res.json({
                source: 'ledger',
                month: targetMonth,
                totalIncome: fromMinorUnits(incomeMinor),
                totalExpense: fromMinorUnits(expenseMinor),
                totalInvested: fromMinorUnits(investedMinor),
                totalSaved: fromMinorUnits(savedMinor),
                savingsRate,
                totalGoalContributions
            });
        }

        // Diagnostic or Unmigrated Fallback Mode: DailyTransaction
        const transactions = await DailyTransaction.findAll({
            where: {
                userId: effectiveUserId,
                date: { [Op.gte]: monthStart, [Op.lte]: monthEnd }
            }
        });

        let totalIncomeMinor = 0n;
        let totalExpenseMinor = 0n;
        let totalInvestedMinor = 0n;
        transactions.forEach(t => {
            const amountMinor = BigInt(String(t.amountMinor ?? 0));
            const absoluteMinor = amountMinor < 0n ? -amountMinor : amountMinor;
            if (t.type === 'income') totalIncomeMinor += absoluteMinor;
            else if (t.type === 'investment') totalInvestedMinor += absoluteMinor;
            else totalExpenseMinor += absoluteMinor;
        });

        const totalSavedMinor = totalIncomeMinor - totalExpenseMinor - totalInvestedMinor;
        const savingsRate = savingsRateFromMinor(totalSavedMinor, totalIncomeMinor);

        res.json({
            source: 'legacy',
            month: targetMonth,
            totalIncome: fromMinorUnits(totalIncomeMinor),
            totalExpense: fromMinorUnits(totalExpenseMinor),
            totalInvested: fromMinorUnits(totalInvestedMinor),
            totalSaved: fromMinorUnits(totalSavedMinor),
            savingsRate,
            totalGoalContributions
        });
    } catch (error) {
        console.error('[SavingsGoals] Error calculating rate:', error);
        res.status(500).json({ error: error.message });
    }
};
