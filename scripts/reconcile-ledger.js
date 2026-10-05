#!/usr/bin/env node
/**
 * MAGNUSOS2 — CLI LEDGER RECONCILIATION RUNNER
 * Usage:
 *   node scripts/reconcile-ledger.js [--user <userId>] [--account <accountId>] [--as-of <YYYY-MM-DD>] [--json]
 */

import { sequelize } from '../server/models/index.js';
import { LedgerReconciliationService } from '../server/services/ledgerReconciliationService.js';

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        userId: null,
        accountId: null,
        asOfDate: null,
        currency: null,
        dryRun: false,
        json: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--user' && args[i + 1]) {
            options.userId = args[++i];
        } else if (arg === '--account' && args[i + 1]) {
            options.accountId = args[++i];
        } else if (arg === '--as-of' && args[i + 1]) {
            options.asOfDate = args[++i];
        } else if (arg === '--currency' && args[i + 1]) {
            options.currency = args[++i];
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--json') {
            options.json = true;
        }
    }

    return options;
}

async function main() {
    const options = parseArgs();
    const service = new LedgerReconciliationService(sequelize);

    try {
        const report = await service.reconcile({
            userId: options.userId,
            accountId: options.accountId,
            asOfDate: options.asOfDate,
            currency: options.currency
        });

        if (options.json) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.log('\n==================================================');
            console.log('       MAGNUSOS2 — LEDGER RECONCILIATION REPORT   ');
            console.log('==================================================');
            console.log(`Status:              ${report.status}`);
            console.log(`Audited Accounts:    ${report.accountsAuditedCount}`);
            console.log(`Reconciled Accounts: ${report.accountsReconciledCount}`);
            console.log(`Discrepancies:       ${report.discrepanciesCount}`);
            console.log(`Security Leaks:      ${report.securityViolationsCount}`);
            console.log(`Transfer Violations: ${report.transferViolationsCount}`);
            console.log('--------------------------------------------------');

            if (report.consolidatedUsers.length > 0) {
                console.log('USER CONSOLIDATED TOTALS:');
                console.table(report.consolidatedUsers.map(u => ({
                    User: u.userId,
                    Currency: u.currency,
                    Accounts: u.accountCount,
                    'Cached (minor)': u.totalCachedMinor,
                    'Derived (minor)': u.totalDerivedMinor,
                    'Diff (minor)': u.netDifferenceMinor,
                    Reconciled: u.isReconciled ? 'YES' : 'ALERT'
                })));
            }

            if (report.discrepancies.length > 0) {
                console.log('\n[!] ACTIVE DISCREPANCIES DETECTED:');
                console.table(report.discrepancies.map(d => ({
                    Account: d.accountName,
                    Id: d.accountId,
                    User: d.userId,
                    Currency: d.currency,
                    Cached: d.cachedBalanceMinor,
                    Derived: d.derivedBalanceMinor,
                    Difference: d.differenceMinor
                })));
            }

            console.log('==================================================\n');
        }

        process.exitCode = report.status === 'HEALTHY' ? 0 : 1;
    } catch (err) {
        if (options.json) {
            console.log(JSON.stringify({ error: err.message, code: err.code || 'UNKNOWN_ERROR' }));
        } else {
            console.error('\n[RECONCILIATION ERROR]', err.message);
        }
        process.exitCode = 1;
    } finally {
        await sequelize.close().catch(() => {});
    }
}

main();
