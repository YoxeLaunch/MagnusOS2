#!/usr/bin/env node
/**
 * MAGNUSOS2 — DAILY TRANSACTIONS CUTOVER & BACKFILL RUNNER
 * Deterministic, idempotent, auditable migration from legacy DailyTransactions to double-entry Ledger.
 *
 * Safety Rules:
 * 1. Must run against isolated PostgreSQL (enforces safety guardrail, rejects production port 5432).
 * 2. Unambiguous traceability via legacy_daily_transaction_mappings table with UNIQUE(daily_transaction_id).
 * 3. Never duplicates the 28 already migrated ledger transactions.
 * 4. Supports --dry-run, --batch-size=<N>, --user=<userId>, --json.
 * 5. Strict transactional rollback per batch on error.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import { Sequelize, DataTypes, Op } from 'sequelize';
import { sequelize as defaultSeq } from '../server/models/index.js';

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: false,
        user: null,
        batchSize: 50,
        json: false,
        allowProduction: false,
        accountMapPath: null,
        dbUrl: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--dry-run') options.dryRun = true;
        else if (arg === '--json') options.json = true;
        else if (arg.startsWith('--user=')) options.user = arg.split('=')[1];
        else if (arg === '--user' && args[i + 1]) options.user = args[++i];
        else if (arg.startsWith('--batch-size=')) options.batchSize = parseInt(arg.split('=')[1], 10);
        else if (arg.startsWith('--db=')) options.dbUrl = arg.split('=')[1];
        else if (arg.startsWith('--account-map=')) options.accountMapPath = arg.slice('--account-map='.length);
        else if (arg === '--allow-production') options.allowProduction = true;
    }
    return options;
}

export function generateLegacyHash(date, amount, description) {
    const raw = `${date}|${amount}|${(description || '').toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

export async function runDailyTransactionsCutover(options = {}) {
    const opts = { ...parseArgs(), ...options };
    const targetDb = opts.sequelize || new Sequelize(opts.dbUrl, { logging: false });

    // Guardrail against accidental production run
    const dialect = targetDb.getDialect();
    if (dialect === 'postgres') {
        const host = targetDb.config.host;
        const port = targetDb.config.port;
        const productionLikeTarget = targetDb.config.database === 'magnus'
            || (['postgres', 'localhost', '127.0.0.1'].includes(host) && Number(port) === 5432);
        if (productionLikeTarget && (!opts.allowProduction || process.env.CUTOVER_PRODUCTION_CONFIRM !== 'I_UNDERSTAND_THE_FINANCIAL_RISK')) {
            throw new Error('[GUARDRAIL] Refusing production-like cutover. Use --allow-production and CUTOVER_PRODUCTION_CONFIRM=I_UNDERSTAND_THE_FINANCIAL_RISK only during an approved maintenance window.');
        }
    }

    let accountMap = opts.accountMap || {};
    if (opts.accountMapPath) {
        try {
            accountMap = JSON.parse(fs.readFileSync(opts.accountMapPath, 'utf8'));
        } catch (error) {
            throw new Error(`[GUARDRAIL] Cannot load reviewed account map: ${error.message}`);
        }
    }

    const report = {
        timestamp: new Date().toISOString(),
        dryRun: opts.dryRun,
        totalLegacyRows: 0,
        alreadyMappedCount: 0,
        previouslyMigratedAnchored: 0,
        newlyMigratedCount: 0,
        skippedCount: 0,
        discrepanciesCount: 0,
        byUser: {},
        byCurrency: {},
        byType: {},
        errors: [],
        discrepancies: []
    };

    try {
        // Schema is owned exclusively by versioned migrations. A dry-run must be
        // read-only and a real run must never invent an ungoverned schema variant.
        if (dialect === 'postgres') {
            const [[mappingTable]] = await targetDb.query(
                "SELECT to_regclass('public.legacy_daily_transaction_mappings') AS table_name;"
            );
            if (!mappingTable?.table_name) {
                throw new Error('[GUARDRAIL] Migration 010 is required before cutover; mappings table is missing.');
            }
        }

        // 1. Fetch already mapped daily transaction IDs
        const [existingMappings] = await targetDb.query(
            `SELECT daily_transaction_id, ledger_transaction_id, status FROM legacy_daily_transaction_mappings;`
        ).catch(() => [[]]);
        const mappedSet = new Set(existingMappings.map(m => m.daily_transaction_id));
        report.alreadyMappedCount = mappedSet.size;

        // 2. Fetch all legacy daily transactions
        let legacyQuery = `SELECT * FROM "DailyTransactions"`;
        const queryParams = [];
        if (opts.user) {
            legacyQuery += ` WHERE "userId" = $1`;
            queryParams.push(opts.user);
        }
        legacyQuery += ` ORDER BY date ASC, id ASC;`;

        const [legacyRows] = await targetDb.query(legacyQuery, { bind: queryParams });
        report.totalLegacyRows = legacyRows.length;

        // 3. Fetch existing ledger transactions to identify already migrated transactions (the 28 initial rows)
        const [existingLedgerTxs] = await targetDb.query(
            `SELECT id, user_id, date, reference, type FROM ledger_transactions WHERE reference LIKE 'migrated:%';`
        );
        const refMap = new Map();
        for (const ltx of existingLedgerTxs) {
            refMap.set(ltx.reference, ltx);
        }

        // 4. Map or migrate each legacy row
        const unmappedRows = [];
        for (const row of legacyRows) {
            const userId = row.userId || 'system';
            const legacyHash = generateLegacyHash(row.date, row.amount, row.description);
            const expectedRef = `migrated:${legacyHash}`;

            // Check if already in mappings table
            if (mappedSet.has(row.id)) {
                continue;
            }

            // Check if matches one of the initial 28 migrated ledger transactions
            const matchingLedgerTx = refMap.get(expectedRef);
            if (matchingLedgerTx && matchingLedgerTx.user_id === userId) {
                if (!opts.dryRun) {
                    await targetDb.query(`
                        INSERT INTO legacy_daily_transaction_mappings 
                        (daily_transaction_id, ledger_transaction_id, user_id, legacy_hash, status, notes)
                        VALUES ($1, $2, $3, $4, 'previously_migrated', 'Anchored to existing ledger transaction')
                        ON CONFLICT (daily_transaction_id) DO NOTHING;
                    `, { bind: [row.id, matchingLedgerTx.id, userId, legacyHash] });
                }
                mappedSet.add(row.id);
                report.previouslyMigratedAnchored++;
                continue;
            }

            // Needs new migration
            unmappedRows.push(row);
        }

        // Process unmapped rows in atomic transactional batches
        const batchSize = opts.batchSize || 50;
        for (let b = 0; b < unmappedRows.length; b += batchSize) {
            const batch = unmappedRows.slice(b, b + batchSize);
            const t = opts.dryRun ? null : await targetDb.transaction();

            try {
                for (const row of batch) {
                    const userId = row.userId;
                    const date = row.date;
                    const amountRaw = row.amount;
                    const description = row.description || 'Transacción legacy';
                    const categoryName = row.category || 'Varios';
                    const legacyType = (row.type || 'expense').toLowerCase();
                    const currency = row.currency || 'DOP';

                    // Track metrics
                    report.byUser[userId] = (report.byUser[userId] || 0) + 1;
                    report.byCurrency[currency] = (report.byCurrency[currency] || 0) + 1;
                    report.byType[legacyType] = (report.byType[legacyType] || 0) + 1;

                    // Semantics check: zero amounts
                    let amountMinor = 0n;
                    try {
                        if (row.amount_minor === null || row.amount_minor === undefined) {
                            throw new Error('amount_minor is required');
                        }
                        amountMinor = BigInt(String(row.amount_minor));
                    } catch {
                        throw new Error(`DailyTransaction #${row.id} has no valid exact amount_minor; resolve reconciliation before cutover.`);
                    }

                    if (amountMinor === 0n) {
                        // Double-entry accounting rejects 0 minor unit lines. Record mapping as skipped_zero_amount
                        if (!opts.dryRun) {
                            await targetDb.query(`
                                INSERT INTO legacy_daily_transaction_mappings 
                                (daily_transaction_id, ledger_transaction_id, user_id, legacy_hash, status, notes)
                                VALUES ($1, NULL, $2, $3, 'skipped_zero_amount', 'Amount is zero')
                                ON CONFLICT (daily_transaction_id) DO NOTHING;
                            `, { bind: [row.id, userId, generateLegacyHash(date, amountRaw, description)], transaction: t });
                        }
                        report.skippedCount++;
                        continue;
                    }

                    // Positive absolute minor units for calculation
                    const absMinor = amountMinor < 0n ? -amountMinor : amountMinor;

                    if (!opts.dryRun) {
                        // Every historical row must have a reviewed account mapping, unless
                        // there is exactly one eligible account for that user/currency.
                        const mapKey = `${userId}:${currency}`;
                        const requestedAccountId = accountMap[mapKey];
                        let [accounts] = await targetDb.query(
                            `SELECT id, currency FROM accounts WHERE user_id = $1 AND currency = $2 AND is_archived = false LIMIT 1;`,
                            { bind: [userId, currency], transaction: t }
                        );

                        let accountId;
                        if (requestedAccountId) {
                            const [mappedAccount] = await targetDb.query(
                                `SELECT id FROM accounts WHERE id = $1 AND user_id = $2 AND currency = $3 AND is_archived = false;`,
                                { bind: [requestedAccountId, userId, currency], transaction: t }
                            );
                            if (mappedAccount.length !== 1) {
                                throw new Error(`Reviewed account map ${mapKey} does not identify an active matching account.`);
                            }
                            accountId = mappedAccount[0].id;
                        } else {
                            const [eligibleAccounts] = await targetDb.query(
                                `SELECT id FROM accounts WHERE user_id = $1 AND currency = $2 AND is_archived = false ORDER BY id;`,
                                { bind: [userId, currency], transaction: t }
                            );
                            if (eligibleAccounts.length !== 1) {
                                throw new Error(`DailyTransaction #${row.id} has ${eligibleAccounts.length} eligible ${currency} accounts. Supply reviewed account map key '${mapKey}'.`);
                            }
                            accountId = eligibleAccounts[0].id;
                        }

                        // Determine category
                        let categoryType = legacyType === 'income' ? 'income' : 'expense';
                        let [categories] = await targetDb.query(
                            `SELECT id FROM categories WHERE user_id = $1 AND name = $2 LIMIT 1;`,
                            { bind: [userId, categoryName], transaction: t }
                        );
                        let categoryId;
                        if (categories.length > 0) {
                            categoryId = categories[0].id;
                        } else {
                            const [newCat] = await targetDb.query(`
                                INSERT INTO categories (id, user_id, name, type, created_at, updated_at)
                                VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
                                RETURNING id;
                            `, { bind: [userId, categoryName, categoryType], transaction: t });
                            categoryId = newCat[0].id;
                        }

                        // Semantics:
                        // Income: Account Debit (+absMinor), Category Credit (-absMinor)
                        // Expense: Account Credit (-absMinor), Category Debit (+absMinor)
                        // Investment: Account Credit (-absMinor), Category Debit (+absMinor)
                        // Refund: Account Debit (+absMinor), Category Credit (-absMinor)
                        const isPositiveToAccount = legacyType === 'income' || legacyType === 'refund';
                        const accountLineDelta = isPositiveToAccount ? absMinor : -absMinor;
                        const categoryLineDelta = -accountLineDelta;

                        const txType = legacyType === 'investment' ? 'investment' : (legacyType === 'income' ? 'income' : 'expense');
                        const txReference = `migrated:daily:${row.id}`;

                        // Create ledger transaction header
                        const [newTx] = await targetDb.query(`
                            INSERT INTO ledger_transactions (id, user_id, date, payee_name, memo, status, type, reference, created_at, updated_at)
                            VALUES (gen_random_uuid(), $1, $2, $3, $4, 'cleared', $5, $6, NOW(), NOW())
                            RETURNING id;
                        `, {
                            bind: [userId, date, description.slice(0, 100), `Migrated from DailyTransaction #${row.id}`, txType, txReference],
                            transaction: t
                        });
                        const ledgerTxId = newTx[0].id;

                        // Create line 1: Account
                        await targetDb.query(`
                            INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, memo, created_at, updated_at)
                            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW());
                        `, {
                            bind: [ledgerTxId, accountId, accountLineDelta.toString(), currency, description.slice(0, 200)],
                            transaction: t
                        });

                        // Create line 2: Category
                        await targetDb.query(`
                            INSERT INTO transaction_lines (id, transaction_id, category_id, amount_minor, currency, memo, created_at, updated_at)
                            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW());
                        `, {
                            bind: [ledgerTxId, categoryId, categoryLineDelta.toString(), currency, categoryName.slice(0, 200)],
                            transaction: t
                        });

                        // Update account balance
                        await targetDb.query(`
                            UPDATE accounts 
                            SET current_balance_minor = current_balance_minor + $1,
                                updated_at = NOW()
                            WHERE id = $2;
                        `, { bind: [accountLineDelta.toString(), accountId], transaction: t });

                        // Record mapping
                        await targetDb.query(`
                            INSERT INTO legacy_daily_transaction_mappings 
                            (daily_transaction_id, ledger_transaction_id, user_id, legacy_hash, status, notes)
                            VALUES ($1, $2, $3, $4, 'migrated', $5)
                            ON CONFLICT (daily_transaction_id) DO NOTHING;
                        `, {
                            bind: [row.id, ledgerTxId, userId, generateLegacyHash(date, amountRaw, description), `Migrated as ${txType}`],
                            transaction: t
                        });
                    }

                    report.newlyMigratedCount++;
                }

                if (t) await t.commit();
            } catch (batchErr) {
                if (t) await t.rollback();
                report.errors.push({ batchIndex: b, error: batchErr.message });
                throw batchErr;
            }
        }

        report.status = report.errors.length === 0 ? 'SUCCESS' : 'FAILED';
        return report;
    } catch (err) {
        report.status = 'ERROR';
        report.fatalError = err.message;
        throw err;
    } finally {
        if (!options.sequelize && targetDb) {
            await targetDb.close().catch(() => {});
        }
    }
}

if (process.argv[1]?.endsWith('cutover-daily-transactions.js')) {
    runDailyTransactionsCutover()
        .then(rep => {
            console.log('\n==================================================');
            console.log('    MAGNUSOS2 — DAILY TRANSACTIONS CUTOVER REPORT ');
            console.log('==================================================');
            console.log(`Status:              ${rep.status}`);
            console.log(`Dry Run:             ${rep.dryRun}`);
            console.log(`Total Legacy Rows:   ${rep.totalLegacyRows}`);
            console.log(`Already Mapped:      ${rep.alreadyMappedCount}`);
            console.log(`Previously Anchored: ${rep.previouslyMigratedAnchored}`);
            console.log(`Newly Migrated:      ${rep.newlyMigratedCount}`);
            console.log(`Skipped (0 minor):   ${rep.skippedCount}`);
            console.log('--------------------------------------------------');
            console.log('BY USER:', rep.byUser);
            console.log('BY CURRENCY:', rep.byCurrency);
            console.log('BY TYPE:', rep.byType);
            if (rep.errors.length > 0) {
                console.log('\n[!] ERRORS:', rep.errors);
            }
            console.log('==================================================\n');
            process.exitCode = rep.status === 'SUCCESS' ? 0 : 1;
        })
        .catch(err => {
            console.error('Fatal error during cutover:', err);
            process.exit(1);
        });
}
