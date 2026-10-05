#!/usr/bin/env node
/**
 * MAGNUSOS2 — RESTORE DRILL RUNNER (Phase II-D)
 * Automated, isolated, reproducible PostgreSQL disaster recovery drill.
 * Tests backup restoration, schema upgrade, exact money reconciliation, and schema drift.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { Sequelize } from 'sequelize';
import { sequelize as mainSequelize } from '../server/models/index.js';
import { MigrationRunner } from '../server/services/migrationRunner.js';
import { SchemaDriftService } from '../server/services/schemaDriftService.js';

const BACKUP_PATH = process.env.BACKUP_PATH || '/home/osvaldo/backups/magnus-os2/magnus_pre_phase2c_backup.sql';
const TEST_HOST = '127.0.0.1';
const TEST_PORT = 5433;
const TEST_USER = 'magnus_test_user';
const TEST_PASS = 'magnus_test_secret_pass';
const DRILL_DB_NAME = 'magnus_restore_drill';

// Safety Guardrail: Refuse to run against production
if (TEST_PORT === 5432 || TEST_HOST === 'postgres') {
    console.error('[SAFETY GUARDRAIL] Fatal: Refusing to run restore drill against production port 5432 or host "postgres"!');
    process.exit(1);
}

function computeFileSha256(filePath) {
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(65536);
    let bytesRead;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) !== 0) {
        hash.update(buffer.subarray(0, bytesRead));
    }
    fs.closeSync(fd);
    return hash.digest('hex');
}

async function runCommand(cmd, args, env = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', d => stdout += d.toString());
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('close', code => {
            if (code === 0) resolve({ stdout, stderr });
            else reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        });
        proc.on('error', reject);
    });
}

export async function runRestoreDrill({ cleanup = true, json = false } = {}) {
    const drillReport = {
        drillTimestamp: new Date().toISOString(),
        backup: {},
        target: {
            host: TEST_HOST,
            port: TEST_PORT,
            database: DRILL_DB_NAME,
            isProduction: false
        },
        timings: {},
        initialState: {},
        upgrade: {},
        structuralValidation: {},
        financialValidation: {},
        driftValidation: {},
        cleanup: {},
        rtoSeconds: 0,
        status: 'RUNNING'
    };

    const overallStart = Date.now();
    const adminDbUrl = `postgresql://${TEST_USER}:${TEST_PASS}@${TEST_HOST}:${TEST_PORT}/postgres`;
    const drillDbUrl = `postgresql://${TEST_USER}:${TEST_PASS}@${TEST_HOST}:${TEST_PORT}/${DRILL_DB_NAME}`;

    let adminSeq = null;
    let drillSeq = null;

    try {
        // 1. Validate Backup File
        if (!fs.existsSync(BACKUP_PATH)) {
            throw new Error(`Backup file not found at ${BACKUP_PATH}`);
        }
        const stat = fs.statSync(BACKUP_PATH);
        const backupSha256 = computeFileSha256(BACKUP_PATH);
        drillReport.backup = {
            path: BACKUP_PATH,
            sizeBytes: stat.size,
            sizeFormatted: `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
            modifiedAt: stat.mtime.toISOString(),
            sha256: backupSha256,
            format: 'PostgreSQL plain text SQL dump'
        };

        // 2. Prepare Isolated Target Database
        const dbCreateStart = Date.now();
        adminSeq = new Sequelize(adminDbUrl, { logging: false });
        await adminSeq.authenticate();

        // Create temporary roles if not existing to satisfy dump ownership commands
        await adminSeq.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'magnus') THEN
                    CREATE ROLE magnus NOLOGIN;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'magnus_app') THEN
                    CREATE ROLE magnus_app NOLOGIN;
                END IF;
                GRANT magnus, magnus_app TO ${TEST_USER};
            END $$;
        `);

        // Force drop and create clean drill DB
        await adminSeq.query(`DROP DATABASE IF EXISTS ${DRILL_DB_NAME} WITH (FORCE);`);
        await adminSeq.query(`CREATE DATABASE ${DRILL_DB_NAME} OWNER ${TEST_USER};`);
        drillReport.timings.dbCreationMs = Date.now() - dbCreateStart;

        // 3. Restore Backup via psql
        const restoreStart = Date.now();
        // Use docker exec or psql client
        await new Promise((resolve, reject) => {
            const psql = spawn('docker', [
                'exec', '-i', 'magnus_postgres_test',
                'psql', '-U', TEST_USER, '-d', DRILL_DB_NAME
            ]);
            const fileStream = fs.createReadStream(BACKUP_PATH);
            fileStream.pipe(psql.stdin);

            let stderr = '';
            psql.stderr.on('data', d => stderr += d.toString());
            psql.on('close', code => {
                // psql might output notices/warnings
                if (code === 0) resolve();
                else reject(new Error(`psql restore exited with code ${code}: ${stderr}`));
            });
            psql.on('error', reject);
        });
        drillReport.timings.restoreExecutionMs = Date.now() - restoreStart;

        // 4. Connect to Restored Database
        drillSeq = new Sequelize(drillDbUrl, { logging: false });
        await drillSeq.authenticate();
        drillSeq.models = mainSequelize.models;

        // 5. Inspect Initial State (pre-Phase II-C schema)
        const [[hasMigrationsTable]] = await drillSeq.query(
            "SELECT to_regclass('public.schema_migrations') AS reg;"
        );
        const [[tableCountRow]] = await drillSeq.query(`
            SELECT COUNT(*)::integer AS count FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `);
        const [[userCountRow]] = await drillSeq.query('SELECT COUNT(*)::integer AS count FROM "Users";');
        const [[accountCountRow]] = await drillSeq.query('SELECT COUNT(*)::integer AS count FROM accounts;');
        const [[dailyTxCountRow]] = await drillSeq.query('SELECT COUNT(*)::integer AS count FROM "DailyTransactions";');
        const [[txCountRow]] = await drillSeq.query('SELECT COUNT(*)::integer AS count FROM "Transactions";');
        const [[wealthCountRow]] = await drillSeq.query('SELECT COUNT(*)::integer AS count FROM "WealthSnapshots";');
        const [[currencyHistoryCountRow]] = await drillSeq.query('SELECT COUNT(*)::integer AS count FROM "CurrencyHistories";');
        const [[ledgerTxCountRow]] = await drillSeq.query('SELECT COUNT(*)::integer AS count FROM ledger_transactions;');
        const [[linesCountRow]] = await drillSeq.query('SELECT COUNT(*)::integer AS count FROM transaction_lines;');

        drillReport.initialState = {
            schemaMigrationsExists: Boolean(hasMigrationsTable.reg),
            tableCount: tableCountRow.count,
            usersCount: userCountRow.count,
            accountsCount: accountCountRow.count,
            dailyTransactionsCount: dailyTxCountRow.count,
            transactionsCount: txCountRow.count,
            wealthSnapshotsCount: wealthCountRow.count,
            currencyHistoriesCount: currencyHistoryCountRow.count,
            ledgerTransactionsCount: ledgerTxCountRow.count,
            transactionLinesCount: linesCountRow.count
        };

        // 6. Execute Baseline and Migrations
        const migrationStart = Date.now();
        const runner = new MigrationRunner(drillSeq);
        await runner.ensureMigrationsTable();

        // Baseline 000_base_schema.sql
        const baselineRes = await runner.markBaseline('000_base_schema.sql', { confirmed: true });
        // Apply remaining migrations (001..007)
        const upRes = await runner.up();
        drillReport.timings.migrationMs = Date.now() - migrationStart;

        drillReport.upgrade = {
            baseline: baselineRes,
            appliedCount: upRes.appliedCount,
            results: upRes.results
        };

        // 7. Structural Validation
        const validationStart = Date.now();
        const status = await runner.status();
        const allApplied = status.every(s => s.applied);
        const allChecksumsValid = status.every(s => s.checksumMatches === true);

        // Check constraints created by 007
        const [constraints] = await drillSeq.query(`
            SELECT conname, contype, convalidated 
            FROM pg_constraint 
            WHERE conname IN (
                'daily_transactions_exact_money_consistent',
                'transactions_exact_money_consistent',
                'wealth_snapshots_exact_money_consistent',
                'currency_histories_exact_rate_consistent'
            )
            ORDER BY conname ASC;
        `);

        // Check NOT NULL columns
        const [notNullCols] = await drillSeq.query(`
            SELECT table_name, column_name, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' 
              AND (
                  (table_name = 'DailyTransactions' AND column_name = 'amount_minor') OR
                  (table_name = 'Transactions' AND column_name = 'amount_minor') OR
                  (table_name = 'WealthSnapshots' AND column_name IN ('net_worth_minor', 'assets_minor', 'liabilities_minor')) OR
                  (table_name = 'CurrencyHistories' AND column_name = 'rate_exact') OR
                  (table_name = 'transaction_lines' AND column_name = 'transaction_id')
              );
        `);

        drillReport.structuralValidation = {
            allMigrationsApplied: allApplied,
            allChecksumsValid,
            migrationsStatus: status.map(s => ({ name: s.name, applied: s.applied, checksumMatches: s.checksumMatches })),
            expectedConstraintsCount: 4,
            foundConstraintsCount: constraints.length,
            constraints: constraints.map(c => ({ name: c.conname, validated: c.convalidated })),
            allConstraintsValidated: constraints.length === 4 && constraints.every(c => c.convalidated),
            allExactColumnsNotNull: notNullCols.length === 7 && notNullCols.every(c => c.is_nullable === 'NO')
        };

        // 8. Financial Reconciliation & Precision Verification
        // DailyTransactions legacy vs exact
        const [[dtAnomalies]] = await drillSeq.query(`
            SELECT COUNT(*)::integer AS count FROM "DailyTransactions"
            WHERE amount_minor IS NULL 
               OR amount::text IN ('NaN', 'Infinity', '-Infinity')
               OR amount_minor IS DISTINCT FROM ROUND((amount * 100)::numeric)::bigint;
        `);

        // Transactions legacy vs exact
        const [[txAnomalies]] = await drillSeq.query(`
            SELECT COUNT(*)::integer AS count FROM "Transactions"
            WHERE amount_minor IS NULL 
               OR amount::text IN ('NaN', 'Infinity', '-Infinity')
               OR amount_minor IS DISTINCT FROM ROUND((amount * 100)::numeric)::bigint;
        `);

        // WealthSnapshots legacy vs exact
        const [[wsAnomalies]] = await drillSeq.query(`
            SELECT COUNT(*)::integer AS count FROM "WealthSnapshots"
            WHERE net_worth_minor IS NULL OR assets_minor IS NULL OR liabilities_minor IS NULL
               OR "netWorth"::text IN ('NaN', 'Infinity', '-Infinity')
               OR net_worth_minor IS DISTINCT FROM ROUND(("netWorth" * 100)::numeric)::bigint;
        `);

        // CurrencyHistories rate vs rate_exact
        const [[chAnomalies]] = await drillSeq.query(`
            SELECT COUNT(*)::integer AS count FROM "CurrencyHistories"
            WHERE rate_exact IS NULL 
               OR rate::text IN ('NaN', 'Infinity', '-Infinity')
               OR rate_exact IS DISTINCT FROM ROUND(rate::numeric, 6);
        `);

        // Ledger balance invariants
        const [unbalancedLedgerTxs] = await drillSeq.query(`
            SELECT transaction_id, SUM(amount_minor) AS sum_minor
            FROM transaction_lines
            GROUP BY transaction_id
            HAVING SUM(amount_minor) != 0;
        `);

        // Debits vs Credits total
        const [[ledgerSums]] = await drillSeq.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN amount_minor > 0 THEN amount_minor ELSE 0 END), 0)::text AS total_debits_minor,
                COALESCE(SUM(CASE WHEN amount_minor < 0 THEN -amount_minor ELSE 0 END), 0)::text AS total_credits_minor
            FROM transaction_lines;
        `);

        // Multiuser isolation in ledger lines
        const [crossUserViolations] = await drillSeq.query(`
            SELECT tl.id AS line_id, lt.id AS tx_id, lt.user_id AS tx_user, a.user_id AS account_user
            FROM transaction_lines tl
            JOIN ledger_transactions lt ON tl.transaction_id = lt.id
            JOIN accounts a ON tl.account_id = a.id
            WHERE lt.user_id != a.user_id;
        `);

        // BIGINT limits check
        const [[bigintLimitsCheck]] = await drillSeq.query(`
            SELECT 
                MIN(amount_minor)::text AS min_daily_amount,
                MAX(amount_minor)::text AS max_daily_amount
            FROM "DailyTransactions";
        `);

        drillReport.financialValidation = {
            dailyTransactionsAudited: dailyTxCountRow.count,
            dailyTransactionsAnomalies: dtAnomalies.count,
            transactionsAudited: txCountRow.count,
            transactionsAnomalies: txAnomalies.count,
            wealthSnapshotsAudited: wealthCountRow.count,
            wealthSnapshotsAnomalies: wsAnomalies.count,
            currencyHistoriesAudited: currencyHistoryCountRow.count,
            currencyHistoriesAnomalies: chAnomalies.count,
            ledgerTransactionsAudited: ledgerTxCountRow.count,
            transactionLinesAudited: linesCountRow.count,
            unbalancedTransactionsCount: unbalancedLedgerTxs.length,
            totalDebitsMinor: ledgerSums.total_debits_minor,
            totalCreditsMinor: ledgerSums.total_credits_minor,
            ledgerSumBalanced: ledgerSums.total_debits_minor === ledgerSums.total_credits_minor,
            crossUserViolationsCount: crossUserViolations.length,
            minDailyAmountMinor: bigintLimitsCheck.min_daily_amount,
            maxDailyAmountMinor: bigintLimitsCheck.max_daily_amount,
            isFinanciallyReconciled: (
                dtAnomalies.count === 0 &&
                txAnomalies.count === 0 &&
                wsAnomalies.count === 0 &&
                chAnomalies.count === 0 &&
                unbalancedLedgerTxs.length === 0 &&
                crossUserViolations.length === 0 &&
                ledgerSums.total_debits_minor === ledgerSums.total_credits_minor
            )
        };

        // 9. Schema Drift Audit
        const driftService = new SchemaDriftService(drillSeq);
        const driftResult = await driftService.audit();
        drillReport.driftValidation = driftResult;

        // Database size
        const [[dbSizeRow]] = await drillSeq.query(`SELECT pg_size_pretty(pg_database_size('${DRILL_DB_NAME}')) AS pretty, pg_database_size('${DRILL_DB_NAME}') AS bytes;`);
        drillReport.target.restoredSizeBytes = Number(dbSizeRow.bytes);
        drillReport.target.restoredSizeFormatted = dbSizeRow.pretty;

        drillReport.timings.validationMs = Date.now() - validationStart;
        drillReport.timings.totalDrillMs = Date.now() - overallStart;
        drillReport.rtoSeconds = Number((drillReport.timings.totalDrillMs / 1000).toFixed(2));

        const isSuccess = (
            drillReport.structuralValidation.allMigrationsApplied &&
            drillReport.structuralValidation.allChecksumsValid &&
            drillReport.structuralValidation.allConstraintsValidated &&
            drillReport.financialValidation.isFinanciallyReconciled &&
            drillReport.driftValidation.isSynced
        );

        drillReport.status = isSuccess ? 'SUCCESS' : 'FAILED';
        return drillReport;

    } finally {
        // Cleanup phase
        const cleanupStart = Date.now();
        if (drillSeq) {
            await drillSeq.close().catch(() => {});
        }
        if (cleanup && adminSeq) {
            try {
                await adminSeq.query(`DROP DATABASE IF EXISTS ${DRILL_DB_NAME} WITH (FORCE);`);
                await adminSeq.query(`
                    DO $$
                    BEGIN
                        -- Cleanup roles if they own no objects
                        DROP OWNED BY magnus_app CASCADE;
                        DROP OWNED BY magnus CASCADE;
                        DROP ROLE IF EXISTS magnus_app;
                        DROP ROLE IF EXISTS magnus;
                    EXCEPTION WHEN OTHERS THEN
                        NULL;
                    END $$;
                `).catch(() => {});
                drillReport.cleanup = { databaseDropped: true, rolesDropped: true };
            } catch (cleanupErr) {
                drillReport.cleanup = { databaseDropped: false, error: cleanupErr.message };
            }
        }
        if (adminSeq) {
            await adminSeq.close().catch(() => {});
        }
        drillReport.timings.cleanupMs = Date.now() - cleanupStart;
    }
}

// Direct CLI execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
    const isJson = process.argv.includes('--json');
    runRestoreDrill({ cleanup: true, json: isJson })
        .then(report => {
            if (isJson) {
                console.log(JSON.stringify(report, null, 2));
            } else {
                console.log('\n==================================================');
                console.log('       MAGNUSOS2 — RESTORE DRILL REPORT           ');
                console.log('==================================================');
                console.log(`Status:              ${report.status}`);
                console.log(`Total RTO:           ${report.rtoSeconds}s`);
                console.log(`Backup File:         ${report.backup.path} (${report.backup.sizeFormatted})`);
                console.log(`Backup SHA-256:      ${report.backup.sha256}`);
                console.log(`Target:              ${report.target.host}:${report.target.port}/${report.target.database}`);
                console.log(`Restored Size:       ${report.target.restoredSizeFormatted}`);
                console.log('--------------------------------------------------');
                console.log('TIMINGS:');
                console.log(` - DB Creation:      ${report.timings.dbCreationMs} ms`);
                console.log(` - Restore:          ${report.timings.restoreExecutionMs} ms`);
                console.log(` - Migrations:       ${report.timings.migrationMs} ms`);
                console.log(` - Validation:       ${report.timings.validationMs} ms`);
                console.log(` - Cleanup:          ${report.timings.cleanupMs} ms`);
                console.log('--------------------------------------------------');
                console.log('STRUCTURAL & INTEGRITY:');
                console.log(` - Migrations:       ${report.structuralValidation.allMigrationsApplied ? 'ALL APPLIED' : 'PENDING'}`);
                console.log(` - Checksums:        ${report.structuralValidation.allChecksumsValid ? 'ALL VALID' : 'MISMATCH'}`);
                console.log(` - Constraints:      ${report.structuralValidation.foundConstraintsCount}/${report.structuralValidation.expectedConstraintsCount} validated`);
                console.log('--------------------------------------------------');
                console.log('FINANCIAL RECONCILIATION:');
                console.log(` - DailyTransactions: ${report.financialValidation.dailyTransactionsAudited} rows (${report.financialValidation.dailyTransactionsAnomalies} anomalies)`);
                console.log(` - Transactions:      ${report.financialValidation.transactionsAudited} rows (${report.financialValidation.transactionsAnomalies} anomalies)`);
                console.log(` - WealthSnapshots:   ${report.financialValidation.wealthSnapshotsAudited} rows (${report.financialValidation.wealthSnapshotsAnomalies} anomalies)`);
                console.log(` - CurrencyHistories: ${report.financialValidation.currencyHistoriesAudited} rows (${report.financialValidation.currencyHistoriesAnomalies} anomalies)`);
                console.log(` - Unbalanced Txs:    ${report.financialValidation.unbalancedTransactionsCount}`);
                console.log(` - Ledger Sum:        ${report.financialValidation.ledgerSumBalanced ? 'BALANCED' : 'UNBALANCED'} (${report.financialValidation.totalDebitsMinor} minor units)`);
                console.log(` - Cross-User Leak:   ${report.financialValidation.crossUserViolationsCount}`);
                console.log('--------------------------------------------------');
                console.log('SCHEMA DRIFT:');
                console.log(` - Status:           ${report.driftValidation.isSynced ? '0 DRIFT (SYNCED)' : 'DRIFT DETECTED'}`);
                console.log(` - Audited Columns:  ${report.driftValidation.auditedColumnsCount}`);
                console.log('==================================================\n');
            }
            process.exit(report.status === 'SUCCESS' ? 0 : 1);
        })
        .catch(err => {
            console.error('\n[RESTORE DRILL FATAL ERROR]', err.message);
            process.exit(1);
        });
}
