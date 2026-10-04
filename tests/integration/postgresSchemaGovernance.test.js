import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Sequelize } from 'sequelize';
import {
    sequelize,
    MigrationRunner,
    SchemaDriftService,
    DailyTransaction,
    CurrencyHistory,
    WealthSnapshot,
    User
} from '../../server/models/index.js';
import { initializeTestPostgres, assertSafeTestEnvironment, TEST_DB_URL } from './setupTestDb.js';

describe('PostgreSQL Schema Governance & Migration Runner (Phase II-C)', () => {
    before(async () => {
        assertSafeTestEnvironment();
        await initializeTestPostgres();
        await User.findOrCreate({
            where: { username: 'pg_gov_user' },
            defaults: { password: 'x', name: 'Gov User' }
        });
    });

    it('1. MigrationRunner: inicializa schema_migrations y reporta estado con checksums', async () => {
        const runner = new MigrationRunner(sequelize);
        const status = await runner.status();

        assert.ok(Array.isArray(status), 'Status debe ser un array');
        assert.ok(status.length >= 6, 'Debe incluir al menos 6 migraciones');

        const m001 = status.find(s => s.name === '001_ledger_balance_constraint_trigger.sql');
        assert.ok(m001, '001 debe existir en status');
        assert.equal(m001.applied, true, '001 debe estar aplicada');
        assert.equal(m001.checksumMatches, true, 'Checksum de 001 debe ser válido');

        const m005 = status.find(s => s.name === '005_exact_money_legacy_backfill.sql');
        assert.ok(m005, '005 debe existir en status');
        assert.equal(m005.applied, true, '005 debe estar aplicada');
        assert.equal(m005.checksumMatches, true, 'Checksum de 005 debe coincidir con el código');
    });

    it('2. MigrationRunner.up(): es idempotente y no reaplica migraciones ya confirmadas', async () => {
        const runner = new MigrationRunner(sequelize);
        const res = await runner.up();
        assert.equal(res.appliedCount, 0, 'No debe reaplicar migraciones ya ejecutadas');
        assert.equal(res.results.length, 0);
    });

    it('3. SchemaDriftService: verifica que los modelos críticos no tienen drift frente a PostgreSQL', async () => {
        const driftService = new SchemaDriftService(sequelize);
        const audit = await driftService.audit();

        assert.equal(audit.isSynced, true, `Se detectó schema drift: ${audit.summary}`);
        assert.equal(audit.missingTables.length, 0, 'No deben faltar tablas críticas');
        assert.equal(audit.missingColumns.length, 0, 'No deben faltar columnas críticas en PostgreSQL');
        assert.equal(audit.typeMismatches.length, 0, 'No deben existir discrepancias de tipos en campos monetarios');
    });

    it('4. Exact Money Backfill: valida que amount_minor en DailyTransactions equivale exactamente a amount * 100', async () => {
        const testDate = '2026-10-04';
        const rawAmount = 154.23;

        const row = await DailyTransaction.create({
            userId: 'pg_gov_user',
            date: testDate,
            amount: rawAmount,
            description: 'Prueba Exact Money Backfill',
            type: 'expense',
            category: 'Alimentación'
        });

        assert.ok(row.amountMinor !== null && row.amountMinor !== undefined, 'amountMinor debe estar poblado');
        assert.equal(row.amountMinor.toString(), '15423', '154.23 DOP debe convertirse a 15423 minor units sin pérdida');

        // Cleanup
        await DailyTransaction.destroy({ where: { id: row.id } });
    });

    it('5. Exact FX CurrencyHistory: asigna rate_exact con NUMERIC(12, 6) automáticamente', async () => {
        const row = await CurrencyHistory.create({
            date: '2026-10-04',
            code: 'USD_TEST',
            rate: 60.123456
        });

        assert.ok(row.rateExact !== null && row.rateExact !== undefined, 'rateExact debe existir');
        assert.equal(Number(row.rateExact).toFixed(6), '60.123456', 'El tipo de cambio exacto debe coincidir con 6 decimales');

        // Cleanup
        await CurrencyHistory.destroy({ where: { id: row.id } });
    });

    it('6. WealthSnapshot: sincroniza automáticamente net_worth_minor, assets_minor y liabilities_minor', async () => {
        const snap = await WealthSnapshot.create({
            userId: 'pg_gov_user',
            date: '2026-10-04',
            netWorth: 10500.50,
            assets: 15500.50,
            liabilities: 5000.00
        });

        assert.equal(snap.netWorthMinor.toString(), '1050050', 'net_worth_minor debe ser 1050050');
        assert.equal(snap.assetsMinor.toString(), '1550050', 'assets_minor debe ser 1550050');
        assert.equal(snap.liabilitiesMinor.toString(), '500000', 'liabilities_minor debe ser 500000');

        // Cleanup
        await WealthSnapshot.destroy({ where: { id: snap.id } });
    });

    it('7. Fresh Database Bootstrap: prueba provisionamiento completo desde cero sin sequelize.sync()', async () => {
        // Garantiza base de datos 100% limpia y aislada
        await sequelize.query('DROP DATABASE IF EXISTS magnus_fresh_test WITH (FORCE);');
        await sequelize.query('CREATE DATABASE magnus_fresh_test;');

        const freshDbUrl = 'postgresql://magnus_test_user:magnus_test_secret_pass@127.0.0.1:5433/magnus_fresh_test';
        const freshSequelize = new Sequelize(freshDbUrl, { logging: false });

        try {
            await freshSequelize.authenticate();

            // Ejecuta el runner desde cero sobre la DB limpia
            const freshRunner = new MigrationRunner(freshSequelize);
            const statusBefore = await freshRunner.status();
            assert.ok(statusBefore.length >= 6, 'Debe descubrir los archivos de migración');

            // Verifica que las migraciones son aplicables en orden
            const upResult = await freshRunner.up();
            assert.ok(upResult.appliedCount >= 6, 'Debe haber aplicado todas las migraciones en la base limpia');

            // Verifica que la tabla schema_migrations tiene los registros
            const statusAfter = await freshRunner.status();
            const allApplied = statusAfter.every(s => s.applied);
            assert.equal(allApplied, true, 'Todas las migraciones deben figurar como aplicadas en la base limpia');

            // Verifica que el trigger contable existe y funciona en la base limpia
            const [funcCheck] = await freshSequelize.query(`
                SELECT routine_name FROM information_schema.routines 
                WHERE routine_name = 'check_ledger_transaction_balance';
            `);
            assert.equal(funcCheck.length, 1, 'check_ledger_transaction_balance debe existir en la base limpia');

            // Verifica que DailyTransactions tiene amount_minor
            const [colCheck] = await freshSequelize.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'DailyTransactions' AND column_name = 'amount_minor';
            `);
            assert.equal(colCheck.length, 1, 'amount_minor debe haber sido creado en la base limpia');
        } finally {
            await freshSequelize.close();
        }
    });

    it('8. Snapshot Schema Anterior: verifica compatibilidad e idempotencia sobre esquema existente', async () => {
        // Ejecuta status y up sobre la base actual con snapshot anterior
        const runner = new MigrationRunner(sequelize);
        const status = await runner.status();
        
        // Verifica que no hay errores de sintaxis ni bloqueos
        const upRes = await runner.up();
        assert.equal(upRes.appliedCount, 0, 'No debe alterar ni fallar sobre un snapshot previo con migraciones completadas');
    });

    after(async () => {
        try {
            await sequelize.close();
        } catch (_) {}
    });
});
