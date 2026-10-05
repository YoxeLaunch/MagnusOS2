import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Sequelize } from 'sequelize';
import fs from 'node:fs';
import path from 'node:path';
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
    const databaseUrl = name => {
        const url = new URL(TEST_DB_URL);
        url.pathname = `/${name}`;
        return url.toString();
    };

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
        assert.ok(status.length >= 9, 'Debe incluir baseline y migraciones 001–008');

        const m001 = status.find(s => s.name === '001_ledger_balance_constraint_trigger.sql');
        assert.ok(m001, '001 debe existir en status');
        assert.equal(m001.applied, true, '001 debe estar aplicada');
        assert.equal(m001.checksumMatches, true, 'Checksum de 001 debe ser válido');

        const m005 = status.find(s => s.name === '005_exact_money_legacy_backfill.sql');
        assert.ok(m005, '005 debe existir en status');
        assert.equal(m005.applied, true, '005 debe estar aplicada');
        assert.equal(m005.checksumMatches, true, 'Checksum de 005 debe coincidir con el código');
        const m007 = status.find(s => s.name === '007_exact_money_integrity.sql');
        assert.equal(m007?.checksumMatches, true, 'Checksum de 007 debe ser válido');
        const m008 = status.find(s => s.name === '008_job_observability.sql');
        assert.equal(m008?.checksumMatches, true, 'Checksum de 008 debe ser válido');
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
        assert.equal(audit.missingModels.length, 0, 'No deben faltar modelos críticos');
        assert.equal(audit.definitionMismatches.length, 0, 'Nullability y precisión deben coincidir');
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
            const [[trackingBefore]] = await freshSequelize.query(
                "SELECT to_regclass('public.schema_migrations') AS reg"
            );
            assert.equal(trackingBefore.reg, null, 'status debe ser estrictamente read-only');

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
            await sequelize.query('DROP DATABASE IF EXISTS magnus_fresh_test WITH (FORCE);');
        }
    });

    it('8. Snapshot anterior real: preflight reporta NaN y luego migra 005–007 con reconciliación cero', async () => {
        const dbName = 'magnus_upgrade_test';
        await sequelize.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE);`);
        await sequelize.query(`CREATE DATABASE ${dbName};`);
        const upgradeDb = new Sequelize(databaseUrl(dbName), { logging: false });
        const migrationsDir = path.resolve('server/migrations');
        try {
            await upgradeDb.authenticate();
            const runner = new MigrationRunner(upgradeDb);
            await runner.ensureMigrationsTable();
            for (const name of [
                '000_base_schema.sql',
                '001_ledger_balance_constraint_trigger.sql',
                '002_cleanup_duplicate_telegram_indexes.sql',
                '003_monthly_snapshots_user_id.sql',
                '004_fix_pilot_investment_semantics.sql'
            ]) {
                const content = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
                await upgradeDb.query(content);
                if (name !== '000_base_schema.sql') {
                    await upgradeDb.query(
                        'INSERT INTO public.schema_migrations(name, checksum) VALUES ($1, $2)',
                        { bind: [name, MigrationRunner.computeChecksum(content)] }
                    );
                }
            }

            await assert.rejects(
                () => runner.markBaseline('000_base_schema.sql'),
                /explicit --confirm-baseline/
            );
            const baseline = await runner.markBaseline('000_base_schema.sql', { confirmed: true });
            assert.equal(baseline.status, 'BASELINED');

            await upgradeDb.query(`INSERT INTO "DailyTransactions"
                ("userId", date, amount, description, type, "createdAt", "updatedAt")
                VALUES (NULL, '2026-10-04', 'NaN'::float8, 'bad', 'expense', NOW(), NOW())`);
            await assert.rejects(() => runner.up(), /Exact-money preflight failed.*DailyTransactions/);
            const [beforeColumns] = await upgradeDb.query(`SELECT column_name FROM information_schema.columns
                WHERE table_name='DailyTransactions' AND column_name='amount_minor'`);
            assert.equal(beforeColumns.length, 0, 'Preflight debe abortar antes de mutar el schema');

            await upgradeDb.query(`DELETE FROM "DailyTransactions" WHERE description='bad'`);
            await upgradeDb.query(`INSERT INTO "DailyTransactions"
                ("userId", date, amount, description, type, "createdAt", "updatedAt")
                VALUES (NULL, '2026-10-04', 123.45, 'legacy', 'expense', NOW(), NOW())`);
            const result = await runner.up();
            const expectedRemaining = runner.getMigrationFiles().length - 5; // excluding 000-004
            assert.equal(result.appliedCount, expectedRemaining, `Debe aplicar las migraciones posteriores a 004 (${expectedRemaining})`);
            const [[reconciled]] = await upgradeDb.query(`SELECT amount_minor,
                amount_minor = ROUND((amount * 100)::numeric)::bigint AS exact
                FROM "DailyTransactions" WHERE description='legacy'`);
            assert.equal(String(reconciled.amount_minor), '12345');
            assert.equal(reconciled.exact, true);
        } finally {
            await upgradeDb.close();
            await sequelize.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE);`);
        }
    });

    it('9. Hooks exactos: actualizaciones legacy/exact y conflictos no pueden divergir', async () => {
        const row = await DailyTransaction.create({
            userId: 'pg_gov_user', date: '2026-10-04', amount: '1.00', description: 'hook', type: 'expense'
        });
        try {
            await row.update({ amount: '2.00' });
            assert.equal(String(row.amountMinor), '200');
            await row.update({ amountMinor: '300' });
            assert.equal(String(row.amount), '3');
            await assert.rejects(() => row.update({ amount: '4.00', amountMinor: '500' }), /disagree/);
        } finally {
            await row.destroy();
        }
    });

    it('10. Concurrencia usa un lock real y checksum alterado bloquea up()', async () => {
        const dbName = 'magnus_runner_test';
        await sequelize.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE);`);
        await sequelize.query(`CREATE DATABASE ${dbName};`);
        const firstDb = new Sequelize(databaseUrl(dbName), { logging: false, pool: { max: 2, min: 0 } });
        const secondDb = new Sequelize(databaseUrl(dbName), { logging: false, pool: { max: 2, min: 0 } });
        try {
            const runner1 = new MigrationRunner(firstDb);
            const totalFiles = runner1.getMigrationFiles().length;
            const [first, second] = await Promise.all([
                runner1.up(),
                new MigrationRunner(secondDb).up()
            ]);
            assert.equal(first.appliedCount + second.appliedCount, totalFiles, 'Solo un runner aplica cada migración');
            const [duplicates] = await firstDb.query(`SELECT name, COUNT(*)::integer AS count
                FROM schema_migrations GROUP BY name HAVING COUNT(*) > 1`);
            assert.equal(duplicates.length, 0);

            await firstDb.query(`UPDATE schema_migrations SET checksum=repeat('0', 64)
                WHERE name='005_exact_money_legacy_backfill.sql'`);
            await assert.rejects(
                () => new MigrationRunner(secondDb).up(),
                /Migration history integrity failure.*CHECKSUM_MISMATCH/
            );
        } finally {
            await firstDb.close();
            await secondDb.close();
            await sequelize.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE);`);
        }
    });

    after(async () => {
        try {
            await sequelize.close();
        } catch (_) {}
    });
});
