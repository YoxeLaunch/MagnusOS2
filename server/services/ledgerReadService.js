import { Op } from 'sequelize';
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

/**
 * ============================================================================
 * LEDGER READ SERVICE (Phase II Centralized Financial Read Model)
 * ============================================================================
 * Pure, side-effect free financial read model derived exclusively from
 * the double-entry PostgreSQL ledger.
 *
 * Rules:
 * 1. Normalized output without UI presentation strings.
 * 2. All calculations performed in integer minor units (centavos/cents) first.
 * 3. Never mutates database state.
 * 4. Multi-tenant isolation: strictly requires userId.
 * ============================================================================
 */

export class LedgerReadService {

    /**
     * Get account balances (cached vs derived from lines)
     * Supports asOfDate for historical balance snapshots.
     */
    static async getBalances({ userId, accountIds, currency, isArchived = false, asOfDate }) {
        if (!userId) throw new Error('[LedgerReadService] userId is required');

        const where = { userId };
        if (accountIds && accountIds.length > 0) where.id = accountIds;
        if (currency) where.currency = currency;
        if (isArchived !== undefined && isArchived !== null) where.isArchived = isArchived;

        const accounts = await Account.findAll({
            where,
            order: [['sort_order', 'ASC'], ['name', 'ASC']]
        });

        if (accounts.length === 0) {
            return {
                accounts: [],
                totalBalanceMinor: '0',
                totalBalance: 0,
                isAllReconciled: true,
                count: 0
            };
        }

        const ids = accounts.map(a => a.id);

        // Calculate derived balance from transaction_lines for each account
        const lineWhere = {
            accountId: { [Op.in]: ids }
        };

        const lineInclude = [];
        if (asOfDate) {
            lineInclude.push({
                model: LedgerTransaction,
                as: 'transaction',
                required: true,
                where: {
                    date: { [Op.lte]: asOfDate }
                },
                attributes: []
            });
        }

        const lineSums = await TransactionLine.findAll({
            attributes: [
                'accountId',
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount_minor')), 0), 'total_minor']
            ],
            where: lineWhere,
            include: lineInclude,
            group: ['accountId'],
            raw: true
        });

        const lineSumMap = new Map();
        for (const row of lineSums) {
            lineSumMap.set(row.accountId, BigInt(row.total_minor || 0));
        }

        let totalBalanceMinorBigInt = 0n;
        let isAllReconciled = true;

        const resultAccounts = accounts.map(acc => {
            const openingMinor = BigInt(acc.openingBalanceMinor || 0);
            const cachedMinor = BigInt(acc.currentBalanceMinor || 0);
            const linesMinor = lineSumMap.get(acc.id) || 0n;
            const derivedMinor = openingMinor + linesMinor;

            // Only check reconciliation against cached balance if asOfDate is not an historical snapshot
            const isReconciled = asOfDate ? true : cachedMinor === derivedMinor;
            if (!isReconciled) isAllReconciled = false;

            totalBalanceMinorBigInt += derivedMinor;

            return {
                id: acc.id,
                userId: acc.userId,
                name: acc.name,
                type: acc.type,
                currency: acc.currency,
                institution: acc.institution,
                isArchived: acc.isArchived,
                openingBalanceMinor: openingMinor.toString(),
                currentBalanceMinor: cachedMinor.toString(),
                derivedBalanceMinor: derivedMinor.toString(),
                currentBalance: fromMinorUnits(cachedMinor),
                derivedBalance: fromMinorUnits(derivedMinor),
                isReconciled,
                discrepancyMinor: (cachedMinor - derivedMinor).toString()
            };
        });

        return {
            accounts: resultAccounts,
            totalBalanceMinor: totalBalanceMinorBigInt.toString(),
            totalBalance: fromMinorUnits(totalBalanceMinorBigInt),
            isAllReconciled,
            count: resultAccounts.length
        };
    }

    /**
     * Get Cash Flow summary for a given period
     */
    static async getCashFlow({ userId, startDate, endDate, currency = 'DOP', accountIds, endDateExclusive = false }) {
        if (!userId) throw new Error('[LedgerReadService] userId is required');

        const whereTx = { userId };
        if (startDate || endDate) {
            whereTx.date = {};
            if (startDate) whereTx.date[Op.gte] = startDate;
            if (endDate) {
                whereTx.date[endDateExclusive ? Op.lt : Op.lte] = endDate;
            }
        }

        const includeLine = {
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
        };

        const transactions = await LedgerTransaction.findAll({
            where: whereTx,
            include: [includeLine],
            order: [['date', 'ASC']]
        });

        let totalIncomeMinor = 0n;
        let totalExpenseMinor = 0n;
        let totalInvestedMinor = 0n;
        let countedTxCount = 0;
        const dailyMap = new Map();

        for (const tx of transactions) {
            const allLines = tx.lines || [];
            const ownAccountLines = allLines.filter(l => l.accountId && (!l.account || l.account.userId === userId));
            const foreignAccountLines = allLines.filter(l => l.accountId && l.account && l.account.userId !== userId);
            if (foreignAccountLines.length > 0) continue; // Security isolation

            const nonAccountLines = allLines.filter(l => !l.accountId);

            // True internal transfer check:
            // 1. All lines belong to user accounts (no external category or non-account counterparty)
            // 2. At least two lines
            // 3. Net sum per currency across user accounts is zero
            let isInternalTransfer = false;
            if (nonAccountLines.length === 0 && ownAccountLines.length >= 2 && ownAccountLines.length === allLines.length) {
                const currencyTotals = new Map();
                for (const l of ownAccountLines) {
                    const c = l.currency || currency;
                    const curSum = currencyTotals.get(c) || 0n;
                    currencyTotals.set(c, curSum + BigInt(l.amountMinor));
                }
                const allCurrenciesZero = Array.from(currencyTotals.values()).every(sum => sum === 0n);
                if (allCurrenciesZero) {
                    isInternalTransfer = true;
                }
            }

            if (isInternalTransfer) {
                // Internal transfer between own accounts: neutral for consolidated operating cash flow
                continue;
            }

            const dateStr = tx.date;
            if (!dailyMap.has(dateStr)) {
                dailyMap.set(dateStr, { date: dateStr, incomeMinor: 0n, expenseMinor: 0n, investedMinor: 0n, transactionCount: 0 });
            }
            const dayEntry = dailyMap.get(dateStr);
            let hasFlowImpact = false;

            for (const line of ownAccountLines) {
                if (accountIds && accountIds.length > 0 && !accountIds.includes(line.accountId)) {
                    continue;
                }
                if (currency && line.currency && line.currency !== currency) {
                    continue;
                }

                const amountMinor = BigInt(line.amountMinor);

                if (amountMinor > 0n) {
                    // Money entering account
                    if (tx.type === 'expense' || tx.type === 'refund') {
                        // Refund reduces expense
                        totalExpenseMinor -= amountMinor;
                        dayEntry.expenseMinor -= amountMinor;
                    } else if (tx.type === 'investment') {
                        // Liquidation / return of investment reduces invested
                        totalInvestedMinor -= amountMinor;
                        dayEntry.investedMinor -= amountMinor;
                    } else {
                        // Standard income (including external entries tagged transfer)
                        totalIncomeMinor += amountMinor;
                        dayEntry.incomeMinor += amountMinor;
                    }
                    hasFlowImpact = true;
                } else if (amountMinor < 0n) {
                    // Money leaving account
                    const posAmt = -amountMinor;
                    if (tx.type === 'income') {
                        // Reversal of income reduces income
                        totalIncomeMinor -= posAmt;
                        dayEntry.incomeMinor -= posAmt;
                    } else if (tx.type === 'investment') {
                        // Outflow into external investment increases invested
                        totalInvestedMinor += posAmt;
                        dayEntry.investedMinor += posAmt;
                    } else {
                        // Standard expense (including external exits tagged transfer)
                        totalExpenseMinor += posAmt;
                        dayEntry.expenseMinor += posAmt;
                    }
                    hasFlowImpact = true;
                }
            }

            if (hasFlowImpact) {
                countedTxCount++;
                dayEntry.transactionCount += 1;
            }
        }

        const netCashFlowMinor = totalIncomeMinor - totalExpenseMinor - totalInvestedMinor;

        const timeline = Array.from(dailyMap.values()).map(d => ({
            date: d.date,
            incomeMinor: d.incomeMinor.toString(),
            expenseMinor: d.expenseMinor.toString(),
            investedMinor: d.investedMinor.toString(),
            netMinor: (d.incomeMinor - d.expenseMinor - d.investedMinor).toString(),
            income: fromMinorUnits(d.incomeMinor),
            expense: fromMinorUnits(d.expenseMinor),
            invested: fromMinorUnits(d.investedMinor),
            net: fromMinorUnits(d.incomeMinor - d.expenseMinor - d.investedMinor),
            transactionCount: d.transactionCount
        }));

        return {
            period: { startDate: startDate || null, endDate: endDate || null },
            currency,
            totalIncomeMinor: totalIncomeMinor.toString(),
            totalExpenseMinor: totalExpenseMinor.toString(),
            totalInvestedMinor: totalInvestedMinor.toString(),
            netCashFlowMinor: netCashFlowMinor.toString(),
            totalIncome: fromMinorUnits(totalIncomeMinor),
            totalExpense: fromMinorUnits(totalExpenseMinor),
            totalInvested: fromMinorUnits(totalInvestedMinor),
            netCashFlow: fromMinorUnits(netCashFlowMinor),
            transactionCount: countedTxCount,
            timeline
        };
    }

    /**
     * Get Income items and category aggregation
     * Properly applies categoryIds filters and handles split transactions.
     */
    static async getIncome({ userId, startDate, endDate, currency = 'DOP', accountIds, categoryIds, endDateExclusive = false }) {
        if (!userId) throw new Error('[LedgerReadService] userId is required');

        const whereTx = { userId, type: 'income' };
        if (startDate || endDate) {
            whereTx.date = {};
            if (startDate) whereTx.date[Op.gte] = startDate;
            if (endDate) {
                whereTx.date[endDateExclusive ? Op.lt : Op.lte] = endDate;
            }
        }

        const transactions = await LedgerTransaction.findAll({
            where: whereTx,
            include: [
                {
                    model: TransactionLine,
                    as: 'lines',
                    include: [
                        { model: Account, as: 'account', attributes: ['id', 'name', 'type', 'currency', 'userId'], where: { userId }, required: false },
                        { model: Category, as: 'category', attributes: ['id', 'name', 'group', 'type', 'icon', 'color'] }
                    ]
                },
                { model: Payee, as: 'payee', attributes: ['id', 'name'] }
            ],
            order: [['date', 'DESC']]
        });

        let totalMinor = 0n;
        const categoryMap = new Map();
        const items = [];

        for (const tx of transactions) {
            // Find account lines
            const accountLines = tx.lines.filter(l => l.accountId !== null);
            if (accountIds && accountIds.length > 0) {
                const hasMatchingAccount = accountLines.some(l => accountIds.includes(l.accountId));
                if (!hasMatchingAccount) continue;
            }

            // Find category lines (income categories have credit: amountMinor < 0)
            const catLines = tx.lines.filter(l => l.categoryId !== null);

            for (const catLine of catLines) {
                if (categoryIds && categoryIds.length > 0 && !categoryIds.includes(catLine.categoryId)) {
                    continue;
                }

                const rawAmount = BigInt(catLine.amountMinor);
                // In double entry, income category is credit (negative amountMinor).
                // Reversal or debit is negative income.
                const lineAmountMinor = -rawAmount;
                totalMinor += lineAmountMinor;

                const catName = catLine.category?.name || 'Otros Ingresos';
                const catId = catLine.categoryId || 'uncategorized';

                if (!categoryMap.has(catId)) {
                    categoryMap.set(catId, {
                        categoryId: catId,
                        categoryName: catName,
                        group: catLine.category?.group || 'Ingresos',
                        totalMinor: 0n
                    });
                }
                categoryMap.get(catId).totalMinor += lineAmountMinor;

                const accName = accountLines.map(a => a.account?.name).filter(Boolean).join(', ') || 'Cuenta';

                items.push({
                    transactionId: tx.id,
                    lineId: catLine.id,
                    date: tx.date,
                    payeeName: tx.payeeName || tx.payee?.name || 'Ingreso',
                    categoryName: catName,
                    accountName: accName,
                    amountMinor: lineAmountMinor.toString(),
                    amount: fromMinorUnits(lineAmountMinor),
                    currency: catLine.currency || currency,
                    memo: catLine.memo || tx.memo
                });
            }
        }

        const categories = Array.from(categoryMap.values()).map(c => ({
            ...c,
            totalMinor: c.totalMinor.toString(),
            total: fromMinorUnits(c.totalMinor)
        }));

        return {
            totalIncomeMinor: totalMinor.toString(),
            totalIncome: fromMinorUnits(totalMinor),
            currency,
            categories,
            items
        };
    }

    /**
     * Get Expense items and category aggregation
     * Properly applies categoryIds filters and handles split transactions.
     */
    static async getExpenses({ userId, startDate, endDate, currency = 'DOP', accountIds, categoryIds, endDateExclusive = false }) {
        if (!userId) throw new Error('[LedgerReadService] userId is required');

        const whereTx = { userId, type: 'expense' };
        if (startDate || endDate) {
            whereTx.date = {};
            if (startDate) whereTx.date[Op.gte] = startDate;
            if (endDate) {
                whereTx.date[endDateExclusive ? Op.lt : Op.lte] = endDate;
            }
        }

        const transactions = await LedgerTransaction.findAll({
            where: whereTx,
            include: [
                {
                    model: TransactionLine,
                    as: 'lines',
                    include: [
                        { model: Account, as: 'account', attributes: ['id', 'name', 'type', 'currency', 'userId'], where: { userId }, required: false },
                        { model: Category, as: 'category', attributes: ['id', 'name', 'group', 'type', 'icon', 'color'] }
                    ]
                },
                { model: Payee, as: 'payee', attributes: ['id', 'name'] }
            ],
            order: [['date', 'DESC']]
        });

        let totalMinor = 0n;
        const categoryMap = new Map();
        const items = [];

        for (const tx of transactions) {
            // Find account lines
            const accountLines = tx.lines.filter(l => l.accountId !== null);
            if (accountIds && accountIds.length > 0) {
                const hasMatchingAccount = accountLines.some(l => accountIds.includes(l.accountId));
                if (!hasMatchingAccount) continue;
            }

            // Find category lines (expense categories have debit: amountMinor > 0)
            const catLines = tx.lines.filter(l => l.categoryId !== null);

            for (const catLine of catLines) {
                if (categoryIds && categoryIds.length > 0 && !categoryIds.includes(catLine.categoryId)) {
                    continue;
                }

                const rawAmount = BigInt(catLine.amountMinor);
                // In double entry, expense category is debit (positive amountMinor).
                // Refund or credit is negative expense (reduces total expenses).
                const lineAmountMinor = rawAmount;
                totalMinor += lineAmountMinor;

                const catName = catLine.category?.name || 'Otros Gastos';
                const catId = catLine.categoryId || 'uncategorized';

                if (!categoryMap.has(catId)) {
                    categoryMap.set(catId, {
                        categoryId: catId,
                        categoryName: catName,
                        group: catLine.category?.group || 'Gastos',
                        totalMinor: 0n
                    });
                }
                categoryMap.get(catId).totalMinor += lineAmountMinor;

                const accName = accountLines.map(a => a.account?.name).filter(Boolean).join(', ') || 'Cuenta';

                items.push({
                    transactionId: tx.id,
                    lineId: catLine.id,
                    date: tx.date,
                    payeeName: tx.payeeName || tx.payee?.name || 'Gasto',
                    categoryName: catName,
                    accountName: accName,
                    amountMinor: lineAmountMinor.toString(),
                    amount: fromMinorUnits(lineAmountMinor),
                    currency: catLine.currency || currency,
                    memo: catLine.memo || tx.memo
                });
            }
        }

        const categories = Array.from(categoryMap.values()).map(c => ({
            ...c,
            totalMinor: c.totalMinor.toString(),
            total: fromMinorUnits(c.totalMinor)
        }));

        return {
            totalExpenseMinor: totalMinor.toString(),
            totalExpense: fromMinorUnits(totalMinor),
            currency,
            categories,
            items
        };
    }

    /**
     * Get Net Worth (Assets minus Liabilities as of a given date)
     */
    static async getNetWorth({ userId, asOfDate, currency = 'DOP' }) {
        if (!userId) throw new Error('[LedgerReadService] userId is required');

        const balances = await this.getBalances({ userId, currency, isArchived: false, asOfDate });

        let assetsMinor = 0n;
        let liabilitiesMinor = 0n;

        const assetTypes = ['cash', 'checking', 'savings', 'investment'];
        const liabilityTypes = ['credit_card', 'loan'];

        for (const acc of balances.accounts) {
            const balMinor = BigInt(acc.derivedBalanceMinor);
            if (assetTypes.includes(acc.type)) {
                assetsMinor += balMinor;
            } else if (liabilityTypes.includes(acc.type)) {
                // Liabilities: negative balance is debt
                liabilitiesMinor += balMinor < 0n ? -balMinor : balMinor;
            } else {
                assetsMinor += balMinor;
            }
        }

        const netWorthMinor = assetsMinor - liabilitiesMinor;

        return {
            asOfDate: asOfDate || new Date().toISOString().split('T')[0],
            currency,
            assetsMinor: assetsMinor.toString(),
            liabilitiesMinor: liabilitiesMinor.toString(),
            netWorthMinor: netWorthMinor.toString(),
            assets: fromMinorUnits(assetsMinor),
            liabilities: fromMinorUnits(liabilitiesMinor),
            netWorth: fromMinorUnits(netWorthMinor),
            accountsCount: balances.count
        };
    }

    /**
     * Get Category Totals for period
     */
    static async getCategoryTotals({ userId, startDate, endDate, type, currency = 'DOP', accountIds, endDateExclusive = false }) {
        if (!userId) throw new Error('[LedgerReadService] userId is required');

        const whereTx = { userId };
        if (type) whereTx.type = type;
        if (startDate || endDate) {
            whereTx.date = {};
            if (startDate) whereTx.date[Op.gte] = startDate;
            if (endDate) {
                whereTx.date[endDateExclusive ? Op.lt : Op.lte] = endDate;
            }
        }

        const transactions = await LedgerTransaction.findAll({
            where: whereTx,
            include: [
                {
                    model: TransactionLine,
                    as: 'lines',
                    include: [
                        { model: Category, as: 'category' }
                    ]
                }
            ]
        });

        const catMap = new Map();

        for (const tx of transactions) {
            if (tx.type === 'transfer') continue;

            const categoryLine = tx.lines.find(l => l.categoryId !== null);
            const accountLine = tx.lines.find(l => l.accountId !== null);

            if (categoryLine && accountLine) {
                if (accountIds && accountIds.length > 0 && !accountIds.includes(accountLine.accountId)) continue;
                if (currency && accountLine.currency !== currency) continue;

                const cat = categoryLine.category;
                const catId = categoryLine.categoryId;
                const catName = cat?.name || 'Sin Categoría';
                const catType = cat?.type || tx.type;

                if (!catMap.has(catId)) {
                    catMap.set(catId, {
                        categoryId: catId,
                        name: catName,
                        group: cat?.group || 'General',
                        type: catType,
                        totalMinor: 0n
                    });
                }

                const absAmount = BigInt(accountLine.amountMinor) < 0n 
                    ? -BigInt(accountLine.amountMinor) 
                    : BigInt(accountLine.amountMinor);

                catMap.get(catId).totalMinor += absAmount;
            }
        }

        return Array.from(catMap.values())
            .map(c => ({
                ...c,
                totalMinor: c.totalMinor.toString(),
                total: fromMinorUnits(c.totalMinor)
            }))
            .sort((a, b) => (b.total > a.total ? 1 : -1));
    }

    /**
     * Get monthly period summaries for a given year
     */
    static async getPeriodSummaries({ userId, year = new Date().getFullYear(), currency = 'DOP' }) {
        if (!userId) throw new Error('[LedgerReadService] userId is required');

        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const cashFlow = await this.getCashFlow({ userId, startDate, endDate, currency });

        // Group timeline into months
        const monthMap = new Map();
        for (let m = 1; m <= 12; m++) {
            const monthStr = `${year}-${String(m).padStart(2, '0')}`;
            monthMap.set(monthStr, {
                period: monthStr,
                incomeMinor: 0n,
                expenseMinor: 0n,
                investedMinor: 0n,
                transactionCount: 0
            });
        }

        for (const day of cashFlow.timeline) {
            const monthStr = day.date.slice(0, 7);
            if (monthMap.has(monthStr)) {
                const entry = monthMap.get(monthStr);
                entry.incomeMinor += BigInt(day.incomeMinor);
                entry.expenseMinor += BigInt(day.expenseMinor);
                entry.investedMinor += BigInt(day.investedMinor);
                entry.transactionCount += day.transactionCount || 0;
            }
        }

        const periods = Array.from(monthMap.values()).map(m => {
            const netMinor = m.incomeMinor - m.expenseMinor - m.investedMinor;
            const income = fromMinorUnits(m.incomeMinor);
            const expense = fromMinorUnits(m.expenseMinor);
            const net = fromMinorUnits(netMinor);
            const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

            return {
                period: m.period,
                incomeMinor: m.incomeMinor.toString(),
                expenseMinor: m.expenseMinor.toString(),
                investedMinor: m.investedMinor.toString(),
                netMinor: netMinor.toString(),
                income,
                expense,
                net,
                savingsRate,
                transactionCount: m.transactionCount
            };
        });

        return {
            year,
            currency,
            totalIncome: cashFlow.totalIncome,
            totalExpense: cashFlow.totalExpense,
            netCashFlow: cashFlow.netCashFlow,
            periods
        };
    }

    /**
     * Comparative Diagnostic Engine: Legacy vs Ledger
     * Executes both calculations side-by-side for the same user and period.
     */
    static async compareLegacyVsLedger({ userId, startDate, endDate, currency = 'DOP' }) {
        if (!userId) throw new Error('[LedgerReadService] userId is required');

        // 1. Calculate Ledger results
        const ledgerCashFlow = await this.getCashFlow({ userId, startDate, endDate, currency });

        // 2. Query Ledger transactions for identity verification
        const whereLedger = { userId };
        if (startDate || endDate) {
            whereLedger.date = {};
            if (startDate) whereLedger.date[Op.gte] = startDate;
            if (endDate) whereLedger.date[Op.lte] = endDate;
        }

        const ledgerTransactions = await LedgerTransaction.findAll({
            where: whereLedger,
            include: [
                {
                    model: TransactionLine,
                    as: 'lines',
                    include: [{ model: Account, as: 'account', attributes: ['id', 'userId', 'currency'] }]
                }
            ]
        });

        let ledgerTransfersCount = 0;
        let ledgerTransfersTotalMinor = 0n;

        // Categorize ledger transactions and build signature map
        const ledgerSignatures = new Map();
        for (const tx of ledgerTransactions) {
            const ownAccLines = tx.lines.filter(l => l.accountId && (!l.account || l.account.userId === userId));
            const nonAccLines = tx.lines.filter(l => !l.accountId);
            const isInternal = nonAccLines.length === 0 && ownAccLines.length >= 2 && ownAccLines.length === tx.lines.length;

            if (isInternal || tx.type === 'transfer') {
                ledgerTransfersCount++;
                const transferAmountMinor = ownAccLines.reduce((max, l) => {
                    const amt = BigInt(l.amountMinor);
                    return amt > max ? amt : max;
                }, 0n);
                ledgerTransfersTotalMinor += transferAmountMinor;
                continue;
            }

            // Identify external cashflow transactions
            for (const l of ownAccLines) {
                const amt = BigInt(l.amountMinor);
                const absAmt = amt < 0n ? -amt : amt;
                const sigKey = `${tx.date}|${tx.type}|${absAmt.toString()}|${l.currency || currency}`;
                const count = ledgerSignatures.get(sigKey) || 0;
                ledgerSignatures.set(sigKey, count + 1);
            }
        }

        // 3. Calculate Legacy results from DailyTransaction
        const whereLegacy = { userId };
        if (startDate || endDate) {
            whereLegacy.date = {};
            if (startDate) whereLegacy.date[Op.gte] = startDate;
            if (endDate) whereLegacy.date[Op.lte] = endDate;
        }

        const legacyTransactions = await DailyTransaction.findAll({
            where: whereLegacy,
            raw: true
        });

        let legacyIncomeMinor = 0n;
        let legacyExpenseMinor = 0n;
        let legacyInvestedMinor = 0n;
        let identityMatches = 0;
        let identityMismatches = 0;

        for (const tx of legacyTransactions) {
            const amtMinor = toMinorUnitsBigInt(tx.amount || 0);
            if (tx.type === 'income') {
                legacyIncomeMinor += amtMinor;
            } else if (tx.type === 'expense') {
                legacyExpenseMinor += amtMinor;
            } else if (tx.type === 'investment') {
                legacyInvestedMinor += amtMinor;
            }

            const sigKey = `${tx.date}|${tx.type}|${amtMinor.toString()}|${tx.currency || currency}`;
            const available = ledgerSignatures.get(sigKey) || 0;
            if (available > 0) {
                ledgerSignatures.set(sigKey, available - 1);
                identityMatches++;
            } else {
                identityMismatches++;
            }
        }

        const legacyNetMinor = legacyIncomeMinor - legacyExpenseMinor - legacyInvestedMinor;

        const ledgerIncomeMinor = BigInt(ledgerCashFlow.totalIncomeMinor);
        const ledgerExpenseMinor = BigInt(ledgerCashFlow.totalExpenseMinor);
        const ledgerInvestedMinor = BigInt(ledgerCashFlow.totalInvestedMinor);
        const ledgerNetMinor = BigInt(ledgerCashFlow.netCashFlowMinor);

        const incomeDiffMinor = legacyIncomeMinor - ledgerIncomeMinor;
        const expenseDiffMinor = legacyExpenseMinor - ledgerExpenseMinor;
        const investedDiffMinor = legacyInvestedMinor - ledgerInvestedMinor;
        const netDiffMinor = legacyNetMinor - ledgerNetMinor;
        const countDiff = legacyTransactions.length - ledgerCashFlow.transactionCount;

        const isIdentical = incomeDiffMinor === 0n &&
                            expenseDiffMinor === 0n &&
                            investedDiffMinor === 0n &&
                            netDiffMinor === 0n &&
                            countDiff === 0 &&
                            identityMismatches === 0;

        let classification = 'EXACT_MATCH';
        let explanation = 'Resultados contables idénticos y trazabilidad 1:1 verificada.';

        if (!isIdentical) {
            if (countDiff > 0) {
                classification = 'MIGRATION_GAP';
                explanation = `Existen ${countDiff} transacciones registradas en DailyTransactions que aún no se han sincronizado a ledger_transactions (brecha de migración temporal).`;
            } else if (countDiff < 0) {
                classification = 'LEDGER_EXCESS';
                explanation = `Existen ${Math.abs(countDiff)} transacciones en ledger_transactions que no provienen del modelo DailyTransactions.`;
            } else if (identityMismatches > 0 && netDiffMinor === 0n) {
                classification = 'ID_MISMATCH';
                explanation = `Los totales coinciden pero ${identityMismatches} transacciones difieren en clave de identidad (fecha/tipo/monto).`;
            } else if (netDiffMinor >= -100n && netDiffMinor <= 100n) {
                classification = 'ROUNDING';
                explanation = 'Divergencia centesimal menor debida al redondeo/truncamiento de coma flotante legacy al migrar a centavos BIGINT.';
            } else {
                classification = 'SEMANTIC_DIFFERENCE';
                explanation = 'Diferencias semánticas o de fechas entre ambos modelos.';
            }
        }

        return {
            userId,
            period: { startDate: startDate || 'ALL', endDate: endDate || 'ALL' },
            currency,
            legacy: {
                incomeMinor: legacyIncomeMinor.toString(),
                expenseMinor: legacyExpenseMinor.toString(),
                investedMinor: legacyInvestedMinor.toString(),
                netMinor: legacyNetMinor.toString(),
                income: fromMinorUnits(legacyIncomeMinor),
                expense: fromMinorUnits(legacyExpenseMinor),
                invested: fromMinorUnits(legacyInvestedMinor),
                net: fromMinorUnits(legacyNetMinor),
                transactionCount: legacyTransactions.length
            },
            ledger: {
                incomeMinor: ledgerCashFlow.totalIncomeMinor,
                expenseMinor: ledgerCashFlow.totalExpenseMinor,
                investedMinor: ledgerCashFlow.totalInvestedMinor,
                netMinor: ledgerCashFlow.netCashFlowMinor,
                income: ledgerCashFlow.totalIncome,
                expense: ledgerCashFlow.totalExpense,
                invested: ledgerCashFlow.totalInvested,
                net: ledgerCashFlow.netCashFlow,
                transactionCount: ledgerCashFlow.transactionCount,
                transfersCount: ledgerTransfersCount,
                transfersTotalMinor: ledgerTransfersTotalMinor.toString(),
                transfersTotal: fromMinorUnits(ledgerTransfersTotalMinor)
            },
            discrepancy: {
                incomeMinor: incomeDiffMinor.toString(),
                expenseMinor: expenseDiffMinor.toString(),
                investedMinor: investedDiffMinor.toString(),
                netMinor: netDiffMinor.toString(),
                income: fromMinorUnits(incomeDiffMinor),
                expense: fromMinorUnits(expenseDiffMinor),
                invested: fromMinorUnits(investedDiffMinor),
                net: fromMinorUnits(netDiffMinor),
                countDiff,
                identityMatches,
                identityMismatches
            },
            difference: {
                incomeDiffMinor: incomeDiffMinor.toString(),
                expenseDiffMinor: expenseDiffMinor.toString(),
                investedDiffMinor: investedDiffMinor.toString(),
                netDiffMinor: netDiffMinor.toString(),
                incomeDiff: fromMinorUnits(incomeDiffMinor),
                expenseDiff: fromMinorUnits(expenseDiffMinor),
                investedDiff: fromMinorUnits(investedDiffMinor),
                netDiff: fromMinorUnits(netDiffMinor),
                countDiff,
                identityMatches,
                identityMismatches
            },
            classification,
            explanation,
            isIdentical
        };
    }
}

export default LedgerReadService;

