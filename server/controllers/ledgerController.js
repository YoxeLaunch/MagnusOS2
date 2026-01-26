import {
    LedgerTransaction,
    TransactionLine,
    Account,
    Category,
    Payee,
    toMinorUnits,
    fromMinorUnits,
    sequelize
} from '../models/index.js';
import { Op } from 'sequelize';

// ========================================
// GET /api/finanza/ledger
// List transactions with lines
// ========================================
export const getLedgerTransactions = async (req, res) => {
    try {
        const { userId, from, to, accountId, categoryId, status, type, limit = 100, offset = 0 } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const where = { userId };

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
                    { model: Account, as: 'account', attributes: ['id', 'name', 'type', 'currency'] },
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
// POST /api/finanza/transactions
// Create a new transaction with lines
// ========================================
export const createTransaction = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { userId, date, payeeId, payeeName, memo, status = 'pending', type, reference, lines } = req.body;

        // Validation
        if (!userId || !date || !lines || !Array.isArray(lines) || lines.length < 2) {
            await t.rollback();
            return res.status(400).json({
                error: 'userId, date, and at least 2 lines are required'
            });
        }

        // Validate lines sum to 0
        const total = lines.reduce((sum, line) => sum + toMinorUnits(line.amount), 0);
        if (total !== 0) {
            await t.rollback();
            return res.status(400).json({
                error: `Transaction lines must sum to 0. Current sum: ${fromMinorUnits(total)}`,
                sum: fromMinorUnits(total)
            });
        }

        // Create transaction header
        const transaction = await LedgerTransaction.create({
            userId,
            date,
            payeeId,
            payeeName,
            memo,
            status,
            type: type || inferTransactionType(lines),
            reference
        }, { transaction: t });

        // Create lines
        const createdLines = await Promise.all(
            lines.map(line =>
                TransactionLine.create({
                    transactionId: transaction.id,
                    accountId: line.accountId,
                    categoryId: line.categoryId,
                    amountMinor: toMinorUnits(line.amount),
                    currency: line.currency || 'DOP',
                    fxRate: line.fxRate,
                    memo: line.memo
                }, { transaction: t })
            )
        );

        // Update account balances
        await updateAccountBalances(lines, t);

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
        const { userId, date, fromAccountId, toAccountId, amount, memo, reference } = req.body;

        if (!userId || !date || !fromAccountId || !toAccountId || !amount) {
            return res.status(400).json({
                error: 'userId, date, fromAccountId, toAccountId, and amount are required'
            });
        }

        if (fromAccountId === toAccountId) {
            return res.status(400).json({ error: 'Cannot transfer to the same account' });
        }

        // Create as a balanced transaction
        req.body = {
            userId,
            date,
            memo: memo || 'Transfer',
            type: 'transfer',
            reference,
            lines: [
                { accountId: fromAccountId, amount: -Math.abs(amount) },  // Credit (out)
                { accountId: toAccountId, amount: Math.abs(amount) }      // Debit (in)
            ]
        };

        return createTransaction(req, res);
    } catch (error) {
        console.error('[Ledger] Error creating transfer:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// PATCH /api/finanza/transactions/:id
// Update transaction header (status, memo, etc.)
// ========================================
export const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const transaction = await LedgerTransaction.findByPk(id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Only allow updating certain fields
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
// DELETE /api/finanza/transactions/:id
// Delete a transaction and its lines
// ========================================
export const deleteTransaction = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;

        const transaction = await LedgerTransaction.findByPk(id, {
            include: [{ model: TransactionLine, as: 'lines' }]
        });

        if (!transaction) {
            await t.rollback();
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Reverse account balance updates
        const reversedLines = transaction.lines.map(line => ({
            accountId: line.accountId,
            amount: -fromMinorUnits(line.amountMinor)
        }));
        await updateAccountBalances(reversedLines, t);

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
// PATCH /api/finanza/transactions/:id/status
// Quick status update (for reconciliation)
// ========================================
export const updateTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'cleared', 'reconciled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const transaction = await LedgerTransaction.findByPk(id);
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
// Helper Functions
// ========================================

const formatTransaction = (tx) => {
    if (!tx) return null;

    const json = tx.toJSON();
    return {
        ...json,
        lines: json.lines?.map(line => ({
            ...line,
            amount: fromMinorUnits(line.amountMinor)
        }))
    };
};

const inferTransactionType = (lines) => {
    // If all lines have accounts (no categories), it's a transfer
    const hasCategories = lines.some(l => l.categoryId);
    if (!hasCategories) return 'transfer';

    // Check amounts to determine income vs expense
    const hasPositive = lines.some(l => l.amount > 0 && l.categoryId);
    const hasNegative = lines.some(l => l.amount < 0 && l.categoryId);

    if (hasPositive && !hasNegative) return 'income';
    if (hasNegative && !hasPositive) return 'expense';
    return 'expense'; // Default
};

const updateAccountBalances = async (lines, transaction) => {
    for (const line of lines) {
        const account = await Account.findByPk(line.accountId, { transaction });
        if (account) {
            const delta = toMinorUnits(line.amount);
            await account.update({
                currentBalanceMinor: account.currentBalanceMinor + delta
            }, { transaction });
        }
    }
};
