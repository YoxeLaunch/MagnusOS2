import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestPostgres, TEST_DB_URL, sequelize } from './setupTestDb.js';
import {
    Account,
    DailyTransaction,
    LedgerTransaction,
    TransactionLine,
    User,
    sequelize as db
} from '../../server/models/index.js';
import { runDailyTransactionsCutover, generateLegacyHash } from '../../scripts/cutover-daily-transactions.js';

describe('PostgreSQL DailyTransactions Cutover & Backfill (Phase II Remediation)', () => {
    const testUser = 'user_cutover_test';

    before(async () => {
        await initializeTestPostgres();
        await User.findOrCreate({
            where: { username: testUser },
            defaults: { username: testUser, password: 'password', role: 'user' }
        });
    });

    beforeEach(async () => {
        // Clean test user data for deterministic isolation
        await db.query(`DELETE FROM legacy_daily_transaction_mappings WHERE user_id = $1;`, { bind: [testUser] }).catch(() => {});
        await db.query(`DELETE FROM transaction_lines WHERE transaction_id IN (SELECT id FROM ledger_transactions WHERE user_id = $1);`, { bind: [testUser] }).catch(() => {});
        await db.query(`DELETE FROM ledger_transactions WHERE user_id = $1;`, { bind: [testUser] }).catch(() => {});
        await DailyTransaction.destroy({ where: { userId: testUser } });
    });

    it('1. Dry-run no genera mutaciones en DB y reporta el inventario', async () => {
        // Clean previous test data
        await DailyTransaction.destroy({ where: { userId: testUser } });

        // Insert legacy rows
        await DailyTransaction.create({
            userId: testUser,
            date: '2026-03-01',
            amount: 150.00,
            amountMinor: 15000n,
            description: 'Ingreso freelance',
            type: 'income',
            category: 'Trabajo'
        });
        await DailyTransaction.create({
            userId: testUser,
            date: '2026-03-02',
            amount: 50.00,
            amountMinor: 5000n,
            description: 'Supermercado',
            type: 'expense',
            category: 'Comida'
        });
        await DailyTransaction.create({
            userId: testUser,
            date: '2026-03-03',
            amount: 0.00,
            amountMinor: 0n,
            description: 'Gasto cancelado',
            type: 'expense',
            category: 'Varios'
        });

        const initialLedgerCount = await LedgerTransaction.count({ where: { userId: testUser } });

        const report = await runDailyTransactionsCutover({
            sequelize: db,
            dryRun: true,
            user: testUser
        });

        assert.equal(report.status, 'SUCCESS');
        assert.equal(report.dryRun, true);
        assert.equal(report.totalLegacyRows, 3);
        assert.equal(report.newlyMigratedCount, 2);
        assert.equal(report.skippedCount, 1); // 0 minor amount skipped

        const postLedgerCount = await LedgerTransaction.count({ where: { userId: testUser } });
        assert.equal(initialLedgerCount, postLedgerCount, 'Dry run no debe insertar filas en ledger');
    });

    it('2. Ejecución real migra con trazabilidad 1:1 e idempotencia estricta', async () => {
        // Insert legacy rows for test 2
        await DailyTransaction.create({
            userId: testUser,
            date: '2026-03-01',
            amount: 150.00,
            amountMinor: 15000n,
            description: 'Ingreso freelance',
            type: 'income',
            category: 'Trabajo'
        });
        await DailyTransaction.create({
            userId: testUser,
            date: '2026-03-02',
            amount: 50.00,
            amountMinor: 5000n,
            description: 'Supermercado',
            type: 'expense',
            category: 'Comida'
        });
        await DailyTransaction.create({
            userId: testUser,
            date: '2026-03-03',
            amount: 0.00,
            amountMinor: 0n,
            description: 'Gasto cancelado',
            type: 'expense',
            category: 'Varios'
        });

        // Cutover must use a reviewed/unique account; it must never invent one.
        await Account.findOrCreate({
            where: { userId: testUser, name: 'Cuenta única cutover' },
            defaults: {
                userId: testUser,
                name: 'Cuenta única cutover',
                type: 'cash',
                currency: 'DOP',
                openingBalanceMinor: 0n,
                currentBalanceMinor: 0n
            }
        });

        const report = await runDailyTransactionsCutover({
            sequelize: db,
            dryRun: false,
            user: testUser
        });

        assert.equal(report.status, 'SUCCESS');
        assert.equal(report.newlyMigratedCount, 2);
        assert.equal(report.skippedCount, 1);

        // Verify mappings
        const [mappings] = await db.query(
            `SELECT * FROM legacy_daily_transaction_mappings WHERE user_id = $1 ORDER BY daily_transaction_id ASC;`,
            { bind: [testUser] }
        );
        assert.equal(mappings.length, 3);

        const migratedMappings = mappings.filter(m => m.status === 'migrated');
        assert.equal(migratedMappings.length, 2);

        const skippedMappings = mappings.filter(m => m.status === 'skipped_zero_amount');
        assert.equal(skippedMappings.length, 1);

        // Verify double-entry ledger lines for migrated transactions
        for (const m of migratedMappings) {
            const tx = await LedgerTransaction.findByPk(m.ledger_transaction_id, {
                include: [{ model: TransactionLine, as: 'lines' }]
            });
            assert.ok(tx, 'Cabecera de ledger debe existir');
            assert.equal(tx.lines.length, 2, 'Debe tener exactamente 2 líneas contables');

            const sum = tx.lines.reduce((acc, l) => acc + BigInt(l.amountMinor), 0n);
            assert.equal(sum, 0n, 'Partida doble debe sumar exactamente 0');
            assert.equal(tx.lines[0].currency, tx.lines[1].currency, 'Ambas líneas deben usar la misma moneda');
        }

        // Idempotency check: Rerun immediately
        const rerunReport = await runDailyTransactionsCutover({
            sequelize: db,
            dryRun: false,
            user: testUser
        });

        assert.equal(rerunReport.status, 'SUCCESS');
        assert.equal(rerunReport.newlyMigratedCount, 0, 'Re-ejecución no debe duplicar transacciones');
        assert.equal(rerunReport.alreadyMappedCount >= 3, true);
    });

    it('3. Anclaje de transacciones históricas previas sin duplicación', async () => {
        // Create an existing ledger transaction with migrated:<hash> reference
        const testHash = 'abc123def4567890';
        const testDate = '2026-01-15';
        const legacyRow = await DailyTransaction.create({
            userId: testUser,
            date: testDate,
            amount: 75.00,
            amountMinor: 7500n,
            description: 'Consulta medica',
            type: 'expense',
            category: 'Salud'
        });

        // Compute exact hash that matching legacy row generates
        const expectedHash = generateLegacyHash(legacyRow.date, legacyRow.amount, legacyRow.description);
        const expectedRef = `migrated:${expectedHash}`;

        // Create pre-existing ledger transaction atomically
        const tx = await db.transaction();
        let preLedgerId;
        try {
            const [hdr] = await db.query(`
                INSERT INTO ledger_transactions (id, user_id, date, status, type, reference, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, 'cleared', 'expense', $3, NOW(), NOW())
                RETURNING id;
            `, { bind: [testUser, testDate, expectedRef], transaction: tx });

            preLedgerId = hdr[0].id;
            let [acc] = await db.query(`SELECT id FROM accounts WHERE user_id = $1 LIMIT 1;`, { bind: [testUser], transaction: tx });
            if (acc.length === 0) {
                const [newAcc] = await db.query(`
                    INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, sort_order, created_at, updated_at)
                    VALUES (gen_random_uuid(), $1, 'Efectivo', 'cash', 'DOP', 0, 0, 0, NOW(), NOW())
                    RETURNING id;
                `, { bind: [testUser], transaction: tx });
                acc = newAcc;
            }

            await db.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, -7500, 'DOP', NOW(), NOW()),
                       (gen_random_uuid(), $1, NULL, 7500, 'DOP', NOW(), NOW());
            `, { bind: [preLedgerId, acc[0].id], transaction: tx });

            await tx.commit();
        } catch (e) {
            await tx.rollback().catch(() => {});
            throw e;
        }

        // Run cutover
        const report = await runDailyTransactionsCutover({
            sequelize: db,
            dryRun: false,
            user: testUser
        });

        assert.equal(report.status, 'SUCCESS');
        assert.equal(report.previouslyMigratedAnchored, 1, 'Debe anclar la fila pre-migrada sin recrearla');

        // Verify mapping points to preLedgerId
        const [mappingRow] = await db.query(
            `SELECT * FROM legacy_daily_transaction_mappings WHERE daily_transaction_id = $1;`,
            { bind: [legacyRow.id] }
        );
        assert.equal(mappingRow.length, 1);
        assert.equal(mappingRow[0].ledger_transaction_id, preLedgerId);
        assert.equal(mappingRow[0].status, 'previously_migrated');
    });

    after(async () => {
        try {
            await db.close();
        } catch (_) {}
    });
});
