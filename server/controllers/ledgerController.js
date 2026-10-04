import {
    LedgerTransaction,
    TransactionLine,
    Account,
    Category,
    Payee,
    DailyTransaction,
    toMinorUnits,
    toMinorUnitsBigInt,
    fromMinorUnits,
    minorToDecimalString,
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

        // Validate lines sum to 0 in minor units using exact BigInt parser
        let totalMinor = 0n;
        for (const line of lines) {
            if (line.amount === undefined && line.amountMinor === undefined) {
                await t.rollback();
                return res.status(400).json({ error: 'Cada línea debe tener un importe numérico válido' });
            }
            try {
                totalMinor += line.amountMinor !== undefined
                    ? BigInt(String(line.amountMinor))
                    : toMinorUnitsBigInt(line.amount);
            } catch {
                await t.rollback();
                return res.status(400).json({ error: 'Cada línea debe tener un importe numérico válido' });
            }
        }

        if (totalMinor !== 0n) {
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

        for (const accountId of accountIds) {
            const acc = accountMap.get(accountId);
            if (!acc) {
                await t.rollback();
                return res.status(404).json({ error: `Cuenta no encontrada: ${accountId}` });
            }
            if (acc.userId !== effectiveUserId) {
                await t.rollback();
                return res.status(403).json({ error: `Acceso denegado a la cuenta ${acc.name}` });
            }
        }

        // Resolve and validate transaction type
        const resolvedType = type || inferTransactionType(lines);

        // Strict validation: an internal transfer MUST only involve accounts of the same user
        if (resolvedType === 'transfer') {
            const hasNonAccount = lines.some(l => !l.accountId);
            if (hasNonAccount) {
                await t.rollback();
                return res.status(400).json({ error: 'Transferencias internas deben ser exclusivamente entre cuentas de balance' });
            }
        }

        // Validate Payee tenant isolation if payeeId provided
        if (payeeId) {
            const payee = await Payee.findOne({
                where: {
                    id: payeeId,
                    [Op.or]: [{ userId: effectiveUserId }, { userId: 'system' }]
                },
                transaction: t
            });
            if (!payee) {
                await t.rollback();
                return res.status(400).json({ error: 'Payee no encontrado o no pertenece a este usuario' });
            }
        }

        // Validate Category tenant isolation if categoryId provided
        const categoryIds = [...new Set(lines.map(l => l.categoryId).filter(Boolean))];
        if (categoryIds.length > 0) {
            const validCategories = await Category.findAll({
                where: {
                    id: categoryIds,
                    [Op.or]: [{ userId: effectiveUserId }, { userId: 'system' }]
                },
                transaction: t
            });
            if (validCategories.length !== categoryIds.length) {
                await t.rollback();
                return res.status(400).json({ error: 'Una o más categorías no pertenecen a este usuario' });
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
            type: resolvedType,
            reference
        }, { transaction: t });

        // Create lines with string BIGINT amounts
        await Promise.all(
            lines.map(line =>
                TransactionLine.create({
                    transactionId: transaction.id,
                    accountId: line.accountId,
                    categoryId: line.categoryId,
                    amountMinor: line.amountMinor !== undefined
                        ? BigInt(String(line.amountMinor)).toString()
                        : toMinorUnitsBigInt(line.amount).toString(),
                    currency: line.currency || accountMap.get(line.accountId)?.currency || 'DOP',
                    fxRate: line.fxRate,
                    memo: line.memo
                }, { transaction: t })
            )
        );

        // Update account balances atomically with BigInt arithmetic
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

        let amountMinor;
        try {
            amountMinor = toMinorUnitsBigInt(amount);
        } catch {
            return res.status(400).json({ error: 'amount debe ser un número positivo finito' });
        }
        if (amountMinor <= 0n) {
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

        if (sourceAccount.userId !== effectiveUserId || destAccount.userId !== effectiveUserId) {
            return res.status(403).json({ error: 'Solo puedes transferir entre cuentas propias del mismo usuario' });
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
                { accountId: fromAccountId, amountMinor: (-amountMinor).toString(), currency: sourceAccount.currency },
                { accountId: toAccountId, amountMinor: amountMinor.toString(), currency: destAccount.currency }
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

        // Reverse account balance updates using exact negative BigInt delta
        const reversedLines = transaction.lines.map(line => ({
            accountId: line.accountId,
            amountMinor: -BigInt(String(line.amountMinor))
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

        const balances = await LedgerReadService.getBalances({ userId: effectiveUserId });

        const report = balances.accounts.map(acc => {
            const opening = BigInt(acc.openingBalanceMinor);
            const cachedMinor = BigInt(acc.currentBalanceMinor);
            const derivedMinor = BigInt(acc.derivedBalanceMinor);
            const linesDelta = derivedMinor - opening;
            const diffMinor = cachedMinor - derivedMinor;

            return {
                accountId: acc.id,
                accountName: acc.name,
                currency: acc.currency,
                openingBalance: fromMinorUnits(opening),
                linesDelta: fromMinorUnits(linesDelta),
                calculatedBalance: fromMinorUnits(derivedMinor),
                cachedBalance: fromMinorUnits(cachedMinor),
                difference: fromMinorUnits(diffMinor),
                isBalanced: acc.isReconciled
            };
        });

        res.json({
            userId: effectiveUserId,
            status: balances.isAllReconciled ? 'BALANCED' : 'DIVERGENCE_DETECTED',
            allBalanced: balances.isAllReconciled,
            accounts: report,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('[Ledger] Reconciliation error:', err);
        res.status(500).json({ error: err.message });
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

    const categoryAmounts = lines
        .filter(l => l.categoryId)
        .map(l => l.amountMinor !== undefined ? BigInt(String(l.amountMinor)) : toMinorUnitsBigInt(l.amount));
    const hasPositive = categoryAmounts.some(amount => amount > 0n);
    const hasNegative = categoryAmounts.some(amount => amount < 0n);

    // Debit (positive) category lines are expenses; credit (negative) category lines are income.
    if (hasPositive && !hasNegative) return 'expense';
    if (hasNegative && !hasPositive) return 'income';
    return 'expense';
};

const updateAccountBalances = async (lines, accountMap, transaction) => {
    for (const line of lines) {
        if (!line.accountId) continue;
        let account = accountMap ? accountMap.get(line.accountId) : null;
        if (!account) {
            account = await Account.findByPk(line.accountId, { transaction, lock: transaction.LOCK.UPDATE });
        }
        if (account) {
            const deltaMinor = line.amountMinor !== undefined
                ? BigInt(String(line.amountMinor))
                : toMinorUnitsBigInt(line.amount);
            const currentMinor = BigInt(account.currentBalanceMinor != null ? String(account.currentBalanceMinor) : '0');
            const newBalanceMinor = (currentMinor + deltaMinor).toString();
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
        const startDate = req.query.from || req.query.startDate;
        const endDate = req.query.to || req.query.endDate;
        const { currency = 'DOP', accountId, source = 'ledger' } = req.query;

        // Diagnostic Comparison Mode
        if (source === 'compare') {
            const comparison = await LedgerReadService.compareLegacyVsLedger({
                userId: effectiveUserId,
                startDate,
                endDate,
                currency
            });
            return res.json(comparison);
        }

        // Diagnostic Legacy Mode
        if (source === 'legacy') {
            const where = { userId: effectiveUserId };
            if (startDate || endDate) {
                where.date = {};
                if (startDate) where.date[Op.gte] = startDate;
                if (endDate) where.date[Op.lte] = endDate;
            }
            const txs = await DailyTransaction.findAll({ where, raw: true });
            let incomeMinor = 0n;
            let expenseMinor = 0n;
            let investedMinor = 0n;
            txs.forEach(t => {
                const amountMinor = BigInt(String(t.amountMinor ?? t.amount_minor ?? 0));
                const absoluteMinor = amountMinor < 0n ? -amountMinor : amountMinor;
                if (t.type === 'income') incomeMinor += absoluteMinor;
                else if (t.type === 'expense') expenseMinor += absoluteMinor;
                else if (t.type === 'investment') investedMinor += absoluteMinor;
            });
            const netMinor = incomeMinor - expenseMinor - investedMinor;
            return res.json({
                source: 'legacy',
                currency,
                period: { startDate: startDate || null, endDate: endDate || null },
                totalIncomeMinor: incomeMinor.toString(),
                totalExpenseMinor: expenseMinor.toString(),
                totalInvestedMinor: investedMinor.toString(),
                netCashFlowMinor: netMinor.toString(),
                totalIncome: fromMinorUnits(incomeMinor),
                totalExpense: fromMinorUnits(expenseMinor),
                totalInvested: fromMinorUnits(investedMinor),
                netCashFlow: fromMinorUnits(netMinor),
                transactionCount: txs.length
            });
        }

        // Default & Primary: LEDGER = SOURCE OF TRUTH
        const accountIds = accountId ? [accountId] : undefined;
        const result = await LedgerReadService.getCashFlow({
            userId: effectiveUserId,
            startDate,
            endDate,
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
