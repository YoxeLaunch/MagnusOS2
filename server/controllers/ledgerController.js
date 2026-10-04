import {
    LedgerTransaction,
    TransactionLine,
    Account,
    Category,
    Payee,
    DailyTransaction,
    toMinorUnits,
    fromMinorUnits,
    sequelize
} from '../models/index.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import { Op } from 'sequelize';
import { LedgerReadService } from '../services/ledgerReadService.js';

// ========================================
// GET /api/finanza/ledger
// List transactions with lines
// ========================================
export const getLedgerTransactions = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.query.userId);
        const { from, to, accountId, categoryId, status, type, limit = 100, offset = 0 } = req.query;

        const where = { userId: effectiveUserId };

        // Date range filter
        if (from || to) {
            where.date = {};
            if (from) where.date[Op.gte] = from;
            if (to) where.date[Op.lte] = to;
        }

        // Status filter
        if (status) where.status = status;

        // Type filter
        if (type) where.type = type;

        // Build query with includes
        const include = [
            {
                model: TransactionLine,
                as: 'lines',
                include: [
                    { model: Account, as: 'account', attributes: ['id', 'name', 'type', 'currency', 'userId'] },
                    { model: Category, as: 'category', attributes: ['id', 'name', 'group', 'type', 'icon', 'color'] }
                ]
            },
            {
                model: Payee,
                as: 'payee',
                attributes: ['id', 'name']
            }
        ];

        // Account filter (requires join)
        if (accountId) {
            include[0].where = { accountId };
            include[0].required = true;
        }

        // Category filter
        if (categoryId) {
            include[0].where = { ...include[0].where, categoryId };
            include[0].required = true;
        }

        const transactions = await LedgerTransaction.findAndCountAll({
            where,
            include,
            order: [['date', 'DESC'], ['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true
        });

        // Format response
        const formatted = transactions.rows.map(tx => formatTransaction(tx));

        res.json({
            data: formatted,
            total: transactions.count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('[Ledger] Error fetching transactions:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// POST /api/finanza/ledger/transactions
// Create a new transaction with lines (Atomic & Balanced)
// ========================================
export const createTransaction = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const effectiveUserId = getEffectiveUserId(req, req.body.userId);
        const { date, payeeId, payeeName, memo, status = 'pending', type, reference, lines } = req.body;

        // Validation
        if (!date || !lines || !Array.isArray(lines) || lines.length < 2) {
            await t.rollback();
            return res.status(400).json({
                error: 'date and at least 2 lines are required'
            });
        }

        // Validate lines sum to 0 in minor units
        let totalMinor = 0;
        for (const line of lines) {
            if (line.amount === undefined || line.amount === null || isNaN(Number(line.amount))) {
                await t.rollback();
                return res.status(400).json({ error: 'Cada línea debe tener un importe numérico válido' });
            }
            totalMinor += toMinorUnits(line.amount);
        }

        if (totalMinor !== 0) {
            await t.rollback();
            return res.status(400).json({
                error: `Transaction lines must sum to 0. Current sum: ${fromMinorUnits(totalMinor)}`,
                sum: fromMinorUnits(totalMinor)
            });
        }

        // Verify account ownership and lock account rows for atomic balance update
        const accountIds = [...new Set(lines.map(l => l.accountId).filter(Boolean))];
        const accounts = await Account.findAll({
            where: { id: accountIds },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        const accountMap = new Map(accounts.map(a => [a.id, a]));
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        for (const accountId of accountIds) {
            const acc = accountMap.get(accountId);
            if (!acc) {
                await t.rollback();
                return res.status(404).json({ error: `Cuenta no encontrada: ${accountId}` });
            }
            if (!isAdmin && acc.userId !== effectiveUserId) {
                await t.rollback();
                return res.status(403).json({ error: `Acceso denegado a la cuenta ${acc.name}` });
            }
        }

        // Create transaction header
        const transaction = await LedgerTransaction.create({
            userId: effectiveUserId,
            date,
            payeeId,
            payeeName,
            memo,
            status,
            type: type || inferTransactionType(lines),
            reference
        }, { transaction: t });

        // Create lines
        await Promise.all(
            lines.map(line =>
                TransactionLine.create({
                    transactionId: transaction.id,
                    accountId: line.accountId,
                    categoryId: line.categoryId,
                    amountMinor: toMinorUnits(line.amount),
                    currency: line.currency || accountMap.get(line.accountId)?.currency || 'DOP',
                    fxRate: line.fxRate,
                    memo: line.memo
                }, { transaction: t })
            )
        );

        // Update account balances atomically
        await updateAccountBalances(lines, accountMap, t);

        await t.commit();

        // Fetch complete transaction with associations
        const fullTransaction = await LedgerTransaction.findByPk(transaction.id, {
            include: [
                { model: TransactionLine, as: 'lines' },
                { model: Payee, as: 'payee' }
            ]
        });

        res.status(201).json(formatTransaction(fullTransaction));
    } catch (error) {
        await t.rollback();
        console.error('[Ledger] Error creating transaction:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// POST /api/finanza/transfers
// Create a transfer between accounts
// ========================================
export const createTransfer = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.body.userId);
        const { date, fromAccountId, toAccountId, amount, memo, reference } = req.body;

        if (!date || !fromAccountId || !toAccountId || amount === undefined) {
            return res.status(400).json({
                error: 'date, fromAccountId, toAccountId, and amount are required'
            });
        }

        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || !Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'amount debe ser un número positivo finito' });
        }

        if (fromAccountId === toAccountId) {
            return res.status(400).json({ error: 'Source and destination accounts must be different' });
        }

        // Verify account existence and ownership
        const [sourceAccount, destAccount] = await Promise.all([
            Account.findByPk(fromAccountId),
            Account.findByPk(toAccountId)
        ]);

        if (!sourceAccount || !destAccount) {
            return res.status(404).json({ error: 'Una o ambas cuentas no existen' });
        }

        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';
        if (!isAdmin) {
            if (sourceAccount.userId !== effectiveUserId || destAccount.userId !== effectiveUserId) {
                return res.status(403).json({ error: 'Solo puedes transferir entre cuentas propias' });
            }
        }

        // Monedas compatibles
        if (sourceAccount.currency !== destAccount.currency) {
            return res.status(400).json({
                error: `Transferencias directas requieren la misma moneda (${sourceAccount.currency} vs ${destAccount.currency})`
            });
        }

        // Delegate to createTransaction with structured lines
        req.body = {
            userId: effectiveUserId,
            date,
            memo: memo || 'Transfer',
            type: 'transfer',
            reference,
            lines: [
                { accountId: fromAccountId, amount: -Math.abs(numericAmount), currency: sourceAccount.currency },
                { accountId: toAccountId, amount: Math.abs(numericAmount), currency: destAccount.currency }
            ]
        };

        return createTransaction(req, res);
    } catch (error) {
        console.error('[Ledger] Error creating transfer:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// PATCH /api/finanza/ledger/transactions/:id
// Update transaction header (status, memo, etc.)
// ========================================
export const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const effectiveUserId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) where.userId = effectiveUserId;

        const transaction = await LedgerTransaction.findOne({ where });
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Only allow updating non-financial metadata
        const allowedUpdates = ['date', 'payeeId', 'payeeName', 'memo', 'status', 'reference'];
        const filteredUpdates = {};
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }

        await transaction.update(filteredUpdates);

        // Fetch updated transaction
        const fullTransaction = await LedgerTransaction.findByPk(id, {
            include: [
                { model: TransactionLine, as: 'lines' },
                { model: Payee, as: 'payee' }
            ]
        });

        res.json(formatTransaction(fullTransaction));
    } catch (error) {
        console.error('[Ledger] Error updating transaction:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// DELETE /api/finanza/ledger/transactions/:id
// Delete a transaction and its lines (Atomic reverse)
// ========================================
export const deleteTransaction = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const effectiveUserId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) where.userId = effectiveUserId;

        const transaction = await LedgerTransaction.findOne({
            where,
            include: [{ model: TransactionLine, as: 'lines' }],
            transaction: t
        });

        if (!transaction) {
            await t.rollback();
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Lock accounts affected
        const accountIds = [...new Set(transaction.lines.map(l => l.accountId))];
        const accounts = await Account.findAll({
            where: { id: accountIds },
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        const accountMap = new Map(accounts.map(a => [a.id, a]));

        // Reverse account balance updates
        const reversedLines = transaction.lines.map(line => ({
            accountId: line.accountId,
            amount: -fromMinorUnits(line.amountMinor)
        }));
        await updateAccountBalances(reversedLines, accountMap, t);

        // Delete (cascade will remove lines)
        await transaction.destroy({ transaction: t });

        await t.commit();
        res.status(204).send();
    } catch (error) {
        await t.rollback();
        console.error('[Ledger] Error deleting transaction:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// PATCH /api/finanza/ledger/transactions/:id/status
// Quick status update (for reconciliation)
// ========================================
export const updateTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const effectiveUserId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        if (!['pending', 'cleared', 'reconciled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const where = { id };
        if (!isAdmin) where.userId = effectiveUserId;

        const transaction = await LedgerTransaction.findOne({ where });
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        await transaction.update({ status });
        res.json({ id, status });
    } catch (error) {
        console.error('[Ledger] Error updating status:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// GET /api/finanza/ledger/reconciliation
// Reconcile Cached Balances vs Ledger Lines
// ========================================
export const reconcileBalances = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.query.userId);

        const accounts = await Account.findAll({
            where: { userId: effectiveUserId }
        });

        const report = [];

        for (const account of accounts) {
            // Calculate sum of transaction lines for this account
            const linesSumResult = await TransactionLine.sum('amount_minor', {
                where: { accountId: account.id }
            });
            const linesDelta = linesSumResult || 0;
            const opening = account.openingBalanceMinor || 0;
            const calculatedMinor = opening + linesDelta;
            const cachedMinor = account.currentBalanceMinor || 0;
            const diffMinor = cachedMinor - calculatedMinor;

            report.push({
                accountId: account.id,
                accountName: account.name,
                currency: account.currency,
                openingBalance: fromMinorUnits(opening),
                linesDelta: fromMinorUnits(linesDelta),
                calculatedBalance: fromMinorUnits(calculatedMinor),
                cachedBalance: fromMinorUnits(cachedMinor),
                difference: fromMinorUnits(diffMinor),
                isBalanced: diffMinor === 0
            });
        }

        const allBalanced = report.every(r => r.isBalanced);

        res.json({
            userId: effectiveUserId,
            status: allBalanced ? 'BALANCED' : 'DIVERGENCE_DETECTED',
            allBalanced,
            accounts: report,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Ledger] Reconciliation error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// Helper Functions
// ========================================

const formatTransaction = (tx) => {
    if (!tx) return null;

    const json = tx.toJSON ? tx.toJSON() : tx;
    return {
        ...json,
        lines: json.lines?.map(line => ({
            ...(line.toJSON ? line.toJSON() : line),
            amount: fromMinorUnits(line.amountMinor || line.amount_minor)
        }))
    };
};

const inferTransactionType = (lines) => {
    const hasCategories = lines.some(l => l.categoryId);
    if (!hasCategories) return 'transfer';

    const hasPositive = lines.some(l => l.amount > 0 && l.categoryId);
    const hasNegative = lines.some(l => l.amount < 0 && l.categoryId);

    if (hasPositive && !hasNegative) return 'income';
    if (hasNegative && !hasPositive) return 'expense';
    return 'expense';
};

const updateAccountBalances = async (lines, accountMap, transaction) => {
    for (const line of lines) {
        let account = accountMap ? accountMap.get(line.accountId) : null;
        if (!account) {
            account = await Account.findByPk(line.accountId, { transaction, lock: transaction.LOCK.UPDATE });
        }
        if (account) {
            const delta = toMinorUnits(line.amount);
            const newBalanceMinor = (account.currentBalanceMinor || 0) + delta;
            await account.update({
                currentBalanceMinor: newBalanceMinor
            }, { transaction });
            account.currentBalanceMinor = newBalanceMinor;
        }
    }
};

// ========================================
// GET /api/finanza/cashflow
// Centralized Cash Flow summary (Pilot Module Phase II)
// Supports diagnostic source switch: ?source=ledger | ?source=legacy | ?source=compare
// ========================================
export const getCashFlowSummary = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.query.userId);
        const { from, to, currency = 'DOP', accountId, source = 'ledger' } = req.query;

        // Diagnostic Comparison Mode
        if (source === 'compare') {
            const comparison = await LedgerReadService.compareLegacyVsLedger({
                userId: effectiveUserId,
                startDate: from,
                endDate: to,
                currency
            });
            return res.json(comparison);
        }

        // Diagnostic Legacy Mode
        if (source === 'legacy') {
            const where = { userId: effectiveUserId };
            if (from || to) {
                where.date = {};
                if (from) where.date[Op.gte] = from;
                if (to) where.date[Op.lte] = to;
            }
            const txs = await DailyTransaction.findAll({ where, raw: true });
            let income = 0;
            let expense = 0;
            let invested = 0;
            txs.forEach(t => {
                const amt = Number(t.amount) || 0;
                if (t.type === 'income') income += amt;
                else if (t.type === 'expense') expense += amt;
                else if (t.type === 'investment') invested += amt;
            });
            return res.json({
                source: 'legacy',
                currency,
                period: { startDate: from || null, endDate: to || null },
                totalIncome: Number(income.toFixed(2)),
                totalExpense: Number(expense.toFixed(2)),
                totalInvested: Number(invested.toFixed(2)),
                netCashFlow: Number((income - expense - invested).toFixed(2)),
                transactionCount: txs.length
            });
        }

        // Default & Primary: LEDGER = SOURCE OF TRUTH
        const accountIds = accountId ? [accountId] : undefined;
        const result = await LedgerReadService.getCashFlow({
            userId: effectiveUserId,
            startDate: from,
            endDate: to,
            currency,
            accountIds
        });

        res.json({
            source: 'ledger',
            ...result
        });
    } catch (error) {
        console.error('[LedgerController] Error getting cashflow summary:', error);
        res.status(500).json({ error: error.message });
    }
};


