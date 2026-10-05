/**
 * MAGNUSOS2 — LEDGER RECONCILIATION SERVICE (Phase II-D)
 * Strict, read-only reconciliation engine comparing cached account balances
 * against ledger-derived balances from double-entry transaction lines.
 *
 * Invariants & Guarantees:
 * 1. Read-Only: Never mutates accounts, never inserts balancing lines, never auto-fixes.
 * 2. Multi-tenant Isolation: User A never leaks into or influences User B.
 * 3. Exact Minor Units: All computations performed exclusively using BIGINT. Zero Float/Double.
 * 4. Internal Transfer Invariance: Transfers modify individual account balances but have net 0 impact on consolidated wealth.
 */

import { Op } from 'sequelize';
import {
    Account,
    LedgerTransaction,
    TransactionLine,
    sequelize
} from '../models/index.js';

export class LedgerReconciliationService {
    constructor(db = sequelize) {
        this.sequelize = db;
    }

    /**
     * Reconciles accounts for all users, or filtered by user/account.
     * @param {Object} options
     * @param {string} [options.userId] - Optional user boundary
     * @param {string} [options.accountId] - Optional specific account
     * @param {string} [options.asOfDate] - Optional cutoff date (YYYY-MM-DD)
     * @param {string} [options.currency] - Optional currency filter
     * @returns {Promise<Object>} Reconciliation report
     */
    async reconcile({ userId = null, accountId = null, asOfDate = null, currency = null } = {}) {
        const timestamp = new Date().toISOString();
        const accountWhere = {};

        if (userId) {
            accountWhere.userId = userId;
        }

        if (accountId) {
            accountWhere.id = accountId;
        }

        if (currency) {
            accountWhere.currency = currency;
        }

        // 1. Fetch targeted accounts
        const accounts = await Account.findAll({
            where: accountWhere,
            order: [['user_id', 'ASC'], ['sort_order', 'ASC'], ['name', 'ASC']]
        });

        if (accountId && accounts.length === 0) {
            // Verify if account exists under another user (cross-user probe prevention)
            const foreignAccount = await Account.findByPk(accountId);
            if (foreignAccount && userId && foreignAccount.userId !== userId) {
                const err = new Error(`Access denied: Account ${accountId} does not belong to user ${userId}`);
                err.code = 'CROSS_USER_ACCESS_DENIED';
                throw err;
            }
        }

        const accountIds = accounts.map(a => a.id);
        const lineSumMap = new Map();
        const securityViolations = [];

        if (accountIds.length > 0) {
            // 2. Query transaction lines with strict ownership join
            const lineWhere = {
                accountId: { [Op.in]: accountIds }
            };

            const txWhere = {};
            if (asOfDate) {
                txWhere.date = { [Op.lte]: asOfDate };
            }

            // Using raw SQL on the active connection to ensure deterministic BIGINT summation
            // and enforce multi-tenant relationship validation.
            const [lineRows] = await this.sequelize.query(`
                SELECT 
                    tl.account_id,
                    a.user_id AS account_user_id,
                    lt.user_id AS tx_user_id,
                    COALESCE(SUM(tl.amount_minor), 0)::text AS sum_minor,
                    COUNT(tl.id)::integer AS line_count
                FROM transaction_lines tl
                JOIN accounts a ON tl.account_id = a.id
                JOIN ledger_transactions lt ON tl.transaction_id = lt.id
                WHERE tl.account_id IN (:accountIds)
                  ${asOfDate ? 'AND lt.date <= :asOfDate' : ''}
                GROUP BY tl.account_id, a.user_id, lt.user_id;
            `, {
                replacements: { accountIds, asOfDate: asOfDate || null }
            });

            for (const row of lineRows) {
                if (row.account_user_id !== row.tx_user_id) {
                    securityViolations.push({
                        severity: 'CRITICAL_SECURITY_LEAK',
                        accountId: row.account_id,
                        accountUserId: row.account_user_id,
                        transactionUserId: row.tx_user_id,
                        message: 'Transaction line belongs to a transaction owned by a different user!'
                    });
                }
                const existing = lineSumMap.get(row.account_id) || 0n;
                lineSumMap.set(row.account_id, existing + BigInt(row.sum_minor || 0));
            }
        }

        // 3. Evaluate each account against the exact balance formula
        const auditedAccounts = [];
        const discrepancies = [];
        const userSummaryMap = new Map();

        for (const acc of accounts) {
            const openingMinor = BigInt(acc.openingBalanceMinor || 0);
            const cachedMinor = BigInt(acc.currentBalanceMinor || 0);
            const linesSumMinor = lineSumMap.get(acc.id) || 0n;
            const derivedMinor = openingMinor + linesSumMinor;

            // Only compare cached against derived if asOfDate is not an historical snapshot
            const diffMinor = asOfDate ? 0n : (cachedMinor - derivedMinor);
            const isReconciled = diffMinor === 0n;

            const accountAudit = {
                id: acc.id,
                userId: acc.userId,
                name: acc.name,
                type: acc.type,
                currency: acc.currency,
                isArchived: acc.isArchived,
                openingBalanceMinor: openingMinor.toString(),
                cachedBalanceMinor: cachedMinor.toString(),
                derivedBalanceMinor: derivedMinor.toString(),
                differenceMinor: diffMinor.toString(),
                isReconciled
            };

            auditedAccounts.push(accountAudit);

            if (!isReconciled) {
                discrepancies.push({
                    severity: 'ALERT',
                    accountId: acc.id,
                    accountName: acc.name,
                    userId: acc.userId,
                    currency: acc.currency,
                    cachedBalanceMinor: cachedMinor.toString(),
                    derivedBalanceMinor: derivedMinor.toString(),
                    differenceMinor: diffMinor.toString(),
                    timestamp
                });
            }

            // Aggregate by user + currency
            const userKey = `${acc.userId}:${acc.currency}`;
            if (!userSummaryMap.has(userKey)) {
                userSummaryMap.set(userKey, {
                    userId: acc.userId,
                    currency: acc.currency,
                    totalCachedMinor: 0n,
                    totalDerivedMinor: 0n,
                    accountCount: 0,
                    discrepantCount: 0
                });
            }
            const userAgg = userSummaryMap.get(userKey);
            userAgg.totalCachedMinor += cachedMinor;
            userAgg.totalDerivedMinor += derivedMinor;
            userAgg.accountCount += 1;
            if (!isReconciled) userAgg.discrepantCount += 1;
        }

        // 4. Verify Internal Transfer Invariance
        // In a balanced double-entry system, internal transfers between accounts of the same user
        // must have a net sum of 0 across the user's accounts.
        const transferInvarianceViolations = [];
        if (accounts.length > 0) {
            const userIds = [...new Set(accounts.map(a => a.userId))];
            const [transferCheckRows] = await this.sequelize.query(`
                SELECT 
                    lt.id AS tx_id,
                    lt.user_id,
                    lt.date,
                    SUM(tl.amount_minor)::text AS net_transfer_sum
                FROM ledger_transactions lt
                JOIN transaction_lines tl ON lt.id = tl.transaction_id
                WHERE lt.type = 'transfer'
                  AND lt.user_id IN (:userIds)
                  ${asOfDate ? 'AND lt.date <= :asOfDate' : ''}
                GROUP BY lt.id, lt.user_id, lt.date
                HAVING SUM(tl.amount_minor) != 0;
            `, {
                replacements: { userIds, asOfDate: asOfDate || null }
            });

            for (const row of transferCheckRows) {
                transferInvarianceViolations.push({
                    severity: 'TRANSFER_INVARIANCE_VIOLATION',
                    transactionId: row.tx_id,
                    userId: row.user_id,
                    date: row.date,
                    netSumMinor: row.net_transfer_sum,
                    message: 'Internal transfer does not sum to 0 minor units across participating lines'
                });
            }
        }

        const consolidated = Array.from(userSummaryMap.values()).map(u => ({
            userId: u.userId,
            currency: u.currency,
            totalCachedMinor: u.totalCachedMinor.toString(),
            totalDerivedMinor: u.totalDerivedMinor.toString(),
            netDifferenceMinor: (u.totalCachedMinor - u.totalDerivedMinor).toString(),
            accountCount: u.accountCount,
            isReconciled: u.discrepantCount === 0
        }));

        const isHealthy = (
            discrepancies.length === 0 &&
            securityViolations.length === 0 &&
            transferInvarianceViolations.length === 0
        );

        return {
            timestamp,
            status: isHealthy ? 'HEALTHY' : 'DISCREPANCY_DETECTED',
            isReconciled: isHealthy,
            accountsAuditedCount: auditedAccounts.length,
            accountsReconciledCount: auditedAccounts.length - discrepancies.length,
            discrepanciesCount: discrepancies.length,
            securityViolationsCount: securityViolations.length,
            transferViolationsCount: transferInvarianceViolations.length,
            discrepancies,
            securityViolations,
            transferInvarianceViolations,
            consolidatedUsers: consolidated,
            accounts: auditedAccounts
        };
    }
}
