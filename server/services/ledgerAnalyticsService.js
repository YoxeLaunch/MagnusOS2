import { Op } from 'sequelize';
import {
    LedgerTransaction,
    TransactionLine,
    Account,
    Category,
    Payee,
    toMinorUnitsBigInt,
    fromMinorUnits,
    minorToDecimalString,
    sequelize
} from '../models/index.js';
import { LedgerReadService } from './ledgerReadService.js';
import { minorUnitsToSafeNumber } from '../models/account.js';

/**
 * ============================================================================
 * LEDGER ANALYTICS SERVICE (Phase II Centralized Financial Analytics)
 * ============================================================================
 * High-level analytics, timeseries, and consumer read models derived
 * EXCLUSIVELY from the double-entry PostgreSQL ledger.
 *
 * Replaces direct legacy reads in:
 * - Econometrics controller & models (MPC, liquidity forecast, anomaly detection)
 * - Centro de Comando (cycles, annual YTD, monthly comparison)
 * - AI financial context injection
 * - Telegram financial summaries
 * - Monthly analysis background job
 *
 * Guarantees:
 * 1. Single source of financial truth: 100% backed by ledger_transactions.
 * 2. Multi-tenant isolation: strict userId enforcement on all queries.
 * 3. Exact money arithmetic in integer minor units (centavos/cents).
 * 4. Safe conversion to Number with bounds check when required for regressions.
 * ============================================================================
 */
export class LedgerAnalyticsService {

    /**
     * Retrieve normalized transactions derived directly from the double-entry ledger.
     * Matches the consumption format expected by analytics engines.
     *
     * @param {Object} params
     * @param {string} params.userId
     * @param {string} [params.startDate]
     * @param {string} [params.endDate]
     * @param {string} [params.currency='DOP']
     * @param {number} [params.limit]
     * @param {number} [params.offset]
     * @returns {Promise<Array>}
     */
    static async getNormalizedTimeline({ userId, startDate, endDate, currency = 'DOP', limit, offset }) {
        if (!userId) throw new Error('[LedgerAnalyticsService] userId is required');

        const whereTx = { userId };
        if (startDate || endDate) {
            whereTx.date = {};
            if (startDate) whereTx.date[Op.gte] = startDate;
            if (endDate) whereTx.date[Op.lte] = endDate;
        }

        const transactions = await LedgerTransaction.findAll({
            where: whereTx,
            include: [
                {
                    model: TransactionLine,
                    as: 'lines',
                    include: [
                        {
                            model: Account,
                            as: 'account',
                            attributes: ['id', 'name', 'type', 'currency', 'userId'],
                            required: false
                        },
                        {
                            model: Category,
                            as: 'category',
                            attributes: ['id', 'name', 'group', 'type'],
                            required: false
                        }
                    ]
                }
            ],
            order: [['date', 'ASC'], ['created_at', 'ASC']],
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined
        });

        const normalized = [];

        for (const tx of transactions) {
            const lines = tx.lines || [];
            const ownAccountLines = lines.filter(l => l.accountId && (!l.account || l.account.userId === userId));
            const categoryLines = lines.filter(l => l.categoryId);
            const nonAccountLines = lines.filter(l => !l.accountId);

            // Skip internal transfers between own accounts (neutral for timeline income/expense)
            const isInternalTransfer = (
                nonAccountLines.length === 0 &&
                ownAccountLines.length >= 2 &&
                ownAccountLines.length === lines.length
            );

            // Determine principal line for description and category
            const primaryCategoryLine = categoryLines[0];
            const primaryAccountLine = ownAccountLines[0];
            const categoryName = primaryCategoryLine?.category?.name || 'Varios';
            const memo = primaryCategoryLine?.memo || primaryAccountLine?.memo || tx.memo || 'Transacción';

            // Calculate operational amount from account perspectives
            let txAmountMinor = 0n;
            let effectiveType = tx.type || 'expense';

            if (tx.type === 'transfer') {
                if (isInternalTransfer) {
                    effectiveType = 'transfer';
                    txAmountMinor = ownAccountLines[0] ? BigInt(ownAccountLines[0].amountMinor) : 0n;
                    if (txAmountMinor < 0n) txAmountMinor = -txAmountMinor;
                } else {
                    // Transfer with external counterparty
                    const acctLine = ownAccountLines[0];
                    if (acctLine) {
                        const amt = BigInt(acctLine.amountMinor);
                        effectiveType = amt > 0n ? 'income' : 'expense';
                        txAmountMinor = amt < 0n ? -amt : amt;
                    }
                }
            } else if (tx.type === 'income') {
                effectiveType = 'income';
                for (const l of ownAccountLines) {
                    const amt = BigInt(l.amountMinor);
                    if (amt > 0n) txAmountMinor += amt;
                }
                if (txAmountMinor === 0n && primaryCategoryLine) {
                    const catAmt = BigInt(primaryCategoryLine.amountMinor);
                    txAmountMinor = catAmt < 0n ? -catAmt : catAmt;
                }
            } else if (tx.type === 'investment') {
                effectiveType = 'investment';
                for (const l of ownAccountLines) {
                    const amt = BigInt(l.amountMinor);
                    if (amt < 0n) txAmountMinor += -amt;
                }
                if (txAmountMinor === 0n && primaryCategoryLine) {
                    const catAmt = BigInt(primaryCategoryLine.amountMinor);
                    txAmountMinor = catAmt > 0n ? catAmt : -catAmt;
                }
            } else {
                // Default expense
                effectiveType = 'expense';
                for (const l of ownAccountLines) {
                    const amt = BigInt(l.amountMinor);
                    if (amt < 0n) txAmountMinor += -amt;
                }
                if (txAmountMinor === 0n && primaryCategoryLine) {
                    const catAmt = BigInt(primaryCategoryLine.amountMinor);
                    txAmountMinor = catAmt > 0n ? catAmt : -catAmt;
                }
            }

            const safeAmount = minorUnitsToSafeNumber(txAmountMinor, 'Ledger timeline transaction');

            normalized.push({
                id: tx.id,
                date: tx.date,
                amount: safeAmount,
                amountMinor: txAmountMinor.toString(),
                description: memo,
                type: effectiveType,
                category: categoryName,
                currency: primaryAccountLine?.currency || currency,
                isInternalTransfer
            });
        }

        return normalized;
    }

    /**
     * Get datasets required for econometrics analysis (MPC, forecast, anomaly detection).
     * Computed directly from the ledger.
     *
     * @param {Object} params
     * @param {string} params.userId
     * @param {string} [params.currency='DOP']
     * @returns {Promise<Object>}
     */
    static async getEconometricsDataset({ userId, currency = 'DOP' }) {
        if (!userId) throw new Error('[LedgerAnalyticsService] userId is required');

        // 1. Fetch current balances derived from ledger lines
        const balances = await LedgerReadService.getBalances({ userId, currency, isArchived: false });
        const currentBalance = balances.totalBalance;

        // 2. Fetch full cashflow daily timeline
        const cashFlow = await LedgerReadService.getCashFlow({ userId, currency });
        const dailyFlows = (cashFlow.timeline || []).map(day => ({
            date: day.date,
            netFlow: day.net !== undefined ? day.net : (day.netCashFlow ?? 0)
        }));

        // 3. Fetch normalized timeline to build monthly aggregation and per-category expenses
        const timeline = await this.getNormalizedTimeline({ userId, currency });

        // Aggregate monthly income and expense
        const monthlyMap = {};
        for (const t of timeline) {
            if (t.isInternalTransfer) continue;
            const month = t.date.substring(0, 7);
            if (!monthlyMap[month]) {
                monthlyMap[month] = { month, income: 0, expense: 0 };
            }
            if (t.type === 'income') {
                monthlyMap[month].income += t.amount;
            } else if (t.type === 'expense') {
                monthlyMap[month].expense += t.amount;
            }
        }
        const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

        // Aggregate expenses by category for anomaly detection
        const categoryExpenses = timeline
            .filter(t => !t.isInternalTransfer && t.type === 'expense' && t.amount > 0)
            .map(t => ({
                date: t.date.substring(0, 10),
                category: t.category,
                amount: t.amount
            }));

        return {
            currentBalance,
            dailyFlows,
            monthlyData,
            categoryExpenses,
            totalTransactions: timeline.length
        };
    }

    /**
     * Get Command Center (Centro de Comando) datasets derived from the ledger.
     *
     * @param {Object} params
     * @param {string} params.userId
     * @param {number} [params.year]
     * @param {string} [params.cicloId]
     * @param {Object} [params.rates]
     * @returns {Promise<Object>}
     */
    static async getCommandCenterDataset({ userId, year, cicloId, rates = {} }) {
        if (!userId) throw new Error('[LedgerAnalyticsService] userId is required');

        const timeline = await this.getNormalizedTimeline({ userId });
        const balances = await LedgerReadService.getBalances({ userId, isArchived: false });

        return {
            timeline,
            currentBalance: balances.totalBalance,
            totalBalanceMinor: balances.totalBalanceMinor,
            isAllReconciled: balances.isAllReconciled
        };
    }

    /**
     * Get financial summary for Telegram bot.
     *
     * @param {Object} params
     * @param {string} params.userId
     * @returns {Promise<Object>}
     */
    static async getTelegramSummary({ userId }) {
        if (!userId) throw new Error('[LedgerAnalyticsService] userId is required');

        const balances = await LedgerReadService.getBalances({ userId, isArchived: false });
        const cashFlow = await LedgerReadService.getCashFlow({ userId });

        return {
            balance: balances.totalBalance,
            balanceMinor: balances.totalBalanceMinor,
            totalIncome: cashFlow.totalIncome,
            totalIncomeMinor: cashFlow.totalIncomeMinor,
            totalExpense: cashFlow.totalExpense,
            totalExpenses: cashFlow.totalExpense,
            totalExpenseMinor: cashFlow.totalExpenseMinor,
            totalExpensesMinor: cashFlow.totalExpenseMinor,
            totalInvested: cashFlow.totalInvested,
            totalInvestedMinor: cashFlow.totalInvestedMinor,
            netCashFlow: cashFlow.netCashFlow,
            netCashFlowMinor: cashFlow.netCashFlowMinor,
            accountCount: balances.count,
            transactionCount: cashFlow.transactionCount
        };
    }
}
