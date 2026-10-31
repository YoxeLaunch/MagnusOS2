/**
 * MECE Ledger Integration Adapter (Phase 1A)
 * 
 * Provides an experimental, read-only financial adapter that interfaces directly with
 * MagnusOS2 double-entry Ledger data contracts (LedgerTransaction, TransactionLine, Account, Category).
 * 
 * Invariants:
 * 1. Double-Entry Source of Truth: Uses Ledger exclusively. Reconciles with legacy daily transactions
 *    to guarantee ZERO double counting.
 * 2. Minor-Unit Integer Arithmetic: All aggregations are performed in integer centavos (minor units)
 *    using BigInt to prevent floating-point drift.
 * 3. Strict Classification: Distinguishes Income, Expense, Investment, and Internal Transfers.
 * 4. Income Segregation: Distinguishes recurring salary from extraordinary windfalls/bonuses.
 * 5. Analytical Reclassification: Allows non-destructive in-memory reclassifications without mutating
 *    the underlying accounting ledger.
 * 6. User Agnostic: Requires explicit userId, rejecting hardcoded identities.
 */

import { toMinorUnitsBigInt, fromMinorUnits } from '../../services/mece/meceMathUtils.js';
import { parseCanonicalPeriod } from '../../services/mece/temporalGovernance.js';

const TRANSACTION_TYPES = {
    INCOME: 'income',
    EXPENSE: 'expense',
    TRANSFER: 'transfer',
    INVESTMENT: 'investment'
};

const INCOME_STREAM_TYPES = {
    RECURRING_SALARY: 'RECURRING_SALARY',
    VARIABLE_INCENTIVE: 'VARIABLE_INCENTIVE',
    EXTRAORDINARY_BONUS: 'EXTRAORDINARY_BONUS',
    OTHER_INCOME: 'OTHER_INCOME'
};

class MeceLedgerAdapter {
    /**
     * @param {Object} options
     * @param {Object} [options.ledgerService] - Optional mock or real LedgerReadService
     */
    constructor(options = {}) {
        this.ledgerService = options.ledgerService || null;
    }

    /**
     * Normalizes a ledger transaction and its double-entry lines into structured MECE financial events.
     * 
     * @param {Object} params
     * @param {string} params.userId - Owner of the transactions (mandatory)
     * @param {Array<Object>} params.ledgerTransactions - Array of Ledger transactions with included lines
     * @param {Array<Object>} [params.analyticalAdjustments] - In-memory category/type adjustments
     * @param {Set<string>|Map<string, string>} [params.legacyMappings] - Map of legacy_id -> ledger_id for deduplication
     * @returns {Object} Structured financial dataset
     */
    processLedgerDataset({
        userId,
        ledgerTransactions = [],
        analyticalAdjustments = [],
        legacyMappings = new Map()
    }) {
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
            throw new Error('[MeceLedgerAdapter] userId is mandatory and must be a non-empty string');
        }

        const incomeRecords = [];
        const expenseRecords = [];
        const internalTransfers = [];
        const investmentRecords = [];
        const reconciledLegacyIds = new Set();

        let totalIncomeMinor = 0n;
        let totalExpenseMinor = 0n;
        let totalTransferMinor = 0n;

        for (const tx of ledgerTransactions) {
            // Multi-tenant check: ensure transaction belongs to the requested user
            if (tx.userId && tx.userId !== userId) {
                continue; // Reject any transaction belonging to a different tenant
            }

            const txDate = tx.date || tx.transaction_date;
            const parsedP = parseCanonicalPeriod(txDate);
            if (!parsedP) continue;

            const lines = tx.lines || tx.transaction_lines || [];
            const ownAccLines = lines.filter(l => Boolean(l.accountId) && (!l.account || l.account.userId === userId));
            const categoryLines = lines.filter(l => Boolean(l.categoryId || l.category));

            // Deduplication against Legacy: record legacy transaction ID if present
            if (tx.legacyDailyTransactionId) {
                reconciledLegacyIds.add(String(tx.legacyDailyTransactionId));
            }

            // 1. Detect Internal Transfer: 2+ own account lines and NO external category lines
            const isInternal = categoryLines.length === 0 && ownAccLines.length >= 2;
            if (isInternal || tx.type === 'transfer') {
                const transferAmtMinor = ownAccLines.reduce((max, l) => {
                    const amt = BigInt(l.amountMinor !== undefined ? l.amountMinor : (l.amount_minor || 0));
                    const abs = amt < 0n ? -amt : amt;
                    return abs > max ? abs : max;
                }, 0n);

                internalTransfers.push({
                    transactionId: tx.id,
                    date: txDate,
                    period: parsedP.period.substring(0, 7),
                    description: tx.description || 'Transferencia Interna',
                    amountMinor: transferAmtMinor.toString(),
                    amount: fromMinorUnits(transferAmtMinor),
                    isInternal: true
                });
                totalTransferMinor += transferAmtMinor;
                continue;
            }

            // 2. Process Category Lines for Income & Expenses
            for (const cLine of categoryLines) {
                const catObj = cLine.category || {};
                const catName = catObj.name || cLine.categoryName || 'Sin Categoría';
                const catGroup = (catObj.group || '').toLowerCase();
                const rawAmountMinor = BigInt(cLine.amountMinor !== undefined ? cLine.amountMinor : (cLine.amount_minor || 0));

                // Check for Investment accounts/categories
                const isInvestment = catGroup.includes('inversion') || catGroup.includes('patrimonio') ||
                    (cLine.account && (cLine.account.type === 'investment' || cLine.account.type === 'brokerage'));

                if (isInvestment) {
                    const absMinor = rawAmountMinor < 0n ? -rawAmountMinor : rawAmountMinor;
                    investmentRecords.push({
                        transactionId: tx.id,
                        date: txDate,
                        period: parsedP.period.substring(0, 7),
                        category: catName,
                        description: tx.description || cLine.memo,
                        amountMinor: absMinor.toString(),
                        amount: fromMinorUnits(absMinor)
                    });
                    continue;
                }

                // Double entry: Income category is CREDIT (negative amountMinor in transaction_lines)
                // When amountMinor < 0, credit to income means revenue received
                const isIncomeType = tx.type === 'income' || rawAmountMinor < 0n;

                if (isIncomeType) {
                    const positiveIncomeMinor = rawAmountMinor < 0n ? -rawAmountMinor : rawAmountMinor;
                    
                    // Categorize income stream: Recurring Salary vs Variable vs Extraordinary
                    let streamType = INCOME_STREAM_TYPES.OTHER_INCOME;
                    const catLower = catName.toLowerCase();
                    const descLower = (tx.description || '').toLowerCase();

                    if (catLower.includes('salario') || catLower.includes('sueldo') || catLower.includes('nomina')) {
                        streamType = INCOME_STREAM_TYPES.RECURRING_SALARY;
                    } else if (catLower.includes('incentivo') || catLower.includes('comision')) {
                        streamType = INCOME_STREAM_TYPES.VARIABLE_INCENTIVE;
                    } else if (catLower.includes('bonificaci') || catLower.includes('regalia') || catLower.includes('doble sueldo') || descLower.includes('regalia')) {
                        streamType = INCOME_STREAM_TYPES.EXTRAORDINARY_BONUS;
                    }

                    // Check for analytical adjustments
                    let effectiveCategory = catName;
                    let effectiveStreamType = streamType;
                    let adjustmentApplied = null;

                    for (const adj of analyticalAdjustments) {
                        const matchTxId = adj.id && adj.id === tx.id;
                        const matchDatePayee = adj.date && adj.payeePattern &&
                            txDate === adj.date &&
                            new RegExp(adj.payeePattern, 'i').test(tx.payee?.name || tx.description || '');

                        if (matchTxId || matchDatePayee) {
                            effectiveCategory = adj.targetCategory;
                            effectiveStreamType = adj.targetIncomeType || INCOME_STREAM_TYPES.RECURRING_SALARY;
                            adjustmentApplied = {
                                originalCategory: catName,
                                originalType: streamType,
                                reason: adj.reason,
                                appliedAt: new Date().toISOString()
                            };
                            break;
                        }
                    }

                    incomeRecords.push({
                        id: tx.id,
                        date: txDate,
                        period: parsedP.period.substring(0, 7),
                        payeeName: tx.payee ? tx.payee.name : (tx.payeeName || null),
                        category: effectiveCategory,
                        incomeType: effectiveStreamType,
                        originalCategory: adjustmentApplied ? adjustmentApplied.originalCategory : catName,
                        amountMinor: positiveIncomeMinor.toString(),
                        amount: fromMinorUnits(positiveIncomeMinor),
                        adjustmentApplied
                    });

                    totalIncomeMinor += positiveIncomeMinor;
                } else {
                    // Expense category: DEBIT (positive amountMinor in transaction_lines)
                    const positiveExpenseMinor = rawAmountMinor > 0n ? rawAmountMinor : -rawAmountMinor;

                    expenseRecords.push({
                        id: tx.id,
                        date: txDate,
                        period: parsedP.period.substring(0, 7),
                        payeeName: tx.payee ? tx.payee.name : (tx.payeeName || null),
                        category: catName,
                        categoryGroup: catObj.group || null,
                        amountMinor: positiveExpenseMinor.toString(),
                        amount: fromMinorUnits(positiveExpenseMinor),
                        description: tx.description || null
                    });

                    totalExpenseMinor += positiveExpenseMinor;
                }
            }
        }

        return {
            userId,
            totals: {
                incomeMinor: totalIncomeMinor.toString(),
                income: fromMinorUnits(totalIncomeMinor),
                expenseMinor: totalExpenseMinor.toString(),
                expense: fromMinorUnits(totalExpenseMinor),
                transferMinor: totalTransferMinor.toString(),
                transfer: fromMinorUnits(totalTransferMinor),
                netCashFlowMinor: (totalIncomeMinor - totalExpenseMinor).toString(),
                netCashFlow: fromMinorUnits(totalIncomeMinor - totalExpenseMinor)
            },
            counts: {
                incomeCount: incomeRecords.length,
                expenseCount: expenseRecords.length,
                transferCount: internalTransfers.length,
                investmentCount: investmentRecords.length,
                totalTransactionsEvaluated: ledgerTransactions.length,
                deduplicatedLegacyIdsCount: reconciledLegacyIds.size
            },
            incomeRecords,
            expenseRecords,
            internalTransfers,
            investmentRecords,
            reconciledLegacyIds: Array.from(reconciledLegacyIds)
        };
    }
}

export {
    MeceLedgerAdapter,
    TRANSACTION_TYPES,
    INCOME_STREAM_TYPES
};
