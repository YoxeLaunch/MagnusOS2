/**
 * MAGNUSOS2 — PHASE II-D OPERATIONAL CONSOLIDATION TEST SUITE
 * Exhaustive integration & adversarial testing for:
 * 1. Restore Drill & Disaster Recovery
 * 2. Ledger Reconciliation Engine & Multiuser Isolation
 * 3. Job Observability, Concurrency, and Error Sanitization
 * 4. Health Check Probes (Liveness, Readiness, Deep Health)
 * 5. BIGINT Numerical Safety & Adversarial Money Handling
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Sequelize, Op } from 'sequelize';
import {
    sequelize,
    Account,
    LedgerTransaction,
    TransactionLine,
    User,
    toMinorUnitsBigInt,
    fromMinorUnits,
    minorUnitsToSafeNumber
} from '../../server/models/index.js';
import { initializeTestPostgres, assertSafeTestEnvironment, TEST_DB_URL } from './setupTestDb.js';
import { runRestoreDrill } from '../../scripts/restore-drill.js';
import { LedgerReconciliationService } from '../../server/services/ledgerReconciliationService.js';
import {
    JobObservabilityService,
    sanitizeErrorMessage,
    sanitizeMetadata
} from '../../server/services/jobObservabilityService.js';
import {
    getLiveness,
    getReadiness,
    getDeepHealth
} from '../../server/controllers/healthController.js';

describe('Phase II-D Operational Consolidation & Resilience', () => {
    let testUserA = null;
    let testUserB = null;
    let accountA1 = null;
    let accountA2 = null;
    let accountB1 = null;

    before(async () => {
        assertSafeTestEnvironment(TEST_DB_URL);
        await initializeTestPostgres();

        const uidA = `user_a_${Date.now()}`;
        const uidB = `user_b_${Date.now()}`;

        testUserA = await User.create({
            username: uidA,
            password: 'hashed_password_safe',
            name: 'User A'
        });

        testUserB = await User.create({
            username: uidB,
            password: 'hashed_password_safe',
            name: 'User B'
        });

        accountA1 = await Account.create({
            userId: testUserA.username,
            name: 'Checking A1',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: 100000n, // 1,000.00 DOP
            currentBalanceMinor: 100000n
        });

        accountA2 = await Account.create({
            userId: testUserA.username,
            name: 'Savings A2',
            type: 'savings',
            currency: 'DOP',
            openingBalanceMinor: 50000n, // 500.00 DOP
            currentBalanceMinor: 50000n
        });

        accountB1 = await Account.create({
            userId: testUserB.username,
            name: 'Checking B1',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: 200000n, // 2,000.00 DOP
            currentBalanceMinor: 200000n
        });
    });

    after(async () => {
        // Cleanup created test rows
        if (accountA1) await accountA1.destroy().catch(() => {});
        if (accountA2) await accountA2.destroy().catch(() => {});
        if (accountB1) await accountB1.destroy().catch(() => {});
        if (testUserA) await testUserA.destroy().catch(() => {});
        if (testUserB) await testUserB.destroy().catch(() => {});
        try {
            await sequelize.close();
        } catch (_) {}
    });

    // =========================================================================
    // 1. RESTORE DRILL VERIFICATION
    // =========================================================================
    describe('1. Restore Drill & Disaster Recovery', () => {
        it('debe ejecutar exitosamente el simulacro de restauración de respaldo en base aislada', async () => {
            const report = await runRestoreDrill({ cleanup: true, json: true });

            assert.equal(report.status, 'SUCCESS', 'El simulacro de restauración debe ser exitoso');
            assert.ok(report.rtoSeconds > 0 && report.rtoSeconds < 30, 'RTO debe ser menor a 30s');
            assert.equal(report.target.isProduction, false, 'El destino nunca debe ser producción');
            assert.equal(report.structuralValidation.allMigrationsApplied, true, 'Todas las migraciones deben estar aplicadas');
            assert.equal(report.structuralValidation.allChecksumsValid, true, 'Todos los checksums deben ser válidos');
            assert.equal(report.structuralValidation.allConstraintsValidated, true, 'Los constraints exact-money deben estar validados');
            assert.equal(report.financialValidation.isFinanciallyReconciled, true, 'Todos los registros monetarios deben reconciliar con 0 discrepancias');
            assert.equal(report.driftValidation.isSynced, true, 'No debe haber schema drift en la base restaurada');
            assert.equal(report.cleanup.databaseDropped, true, 'La base temporal debe eliminarse en el cleanup');
        });
    });

    // =========================================================================
    // 2. RECONCILIATION ENGINE & MULTIUSER ISOLATION
    // =========================================================================
    describe('2. Ledger Reconciliation Engine & Invariants', () => {
        it('reporta estado HEALTHY cuando los balances en caché coinciden con las líneas del ledger', async () => {
            const service = new LedgerReconciliationService(sequelize);
            const report = await service.reconcile({ userId: testUserA.username });

            assert.equal(report.status, 'HEALTHY');
            assert.equal(report.isReconciled, true);
            assert.equal(report.discrepanciesCount, 0);
            assert.equal(report.accountsAuditedCount, 2);
        });

        it('detecta discrepancia y genera ALERT sin mutar balances cuando hay desalineación', async () => {
            // Skew cached balance intentionally without ledger lines
            await accountA1.update({ currentBalanceMinor: 150000n }); // 1,500.00 DOP cached vs 1,000.00 derived

            const service = new LedgerReconciliationService(sequelize);
            const report = await service.reconcile({ userId: testUserA.username, accountId: accountA1.id });

            assert.equal(report.status, 'DISCREPANCY_DETECTED', 'Debe detectar discrepancia');
            assert.equal(report.isReconciled, false);
            assert.equal(report.discrepanciesCount, 1);
            assert.equal(report.discrepancies[0].differenceMinor, '50000', 'Diferencia debe ser exactamente 50000');
            assert.equal(report.discrepancies[0].accountId, accountA1.id);
            assert.equal(report.discrepancies[0].userId, testUserA.username);

            // Verify READ-ONLY guarantee: balance in DB was NOT modified or auto-fixed
            await accountA1.reload();
            assert.equal(String(accountA1.currentBalanceMinor), '150000', 'El balance en DB no debe haber sido mutado');

            // Restore balance
            await accountA1.update({ currentBalanceMinor: 100000n });
        });

        it('aísla usuarios: Usuario A no puede consultar o reconciliar cuentas del Usuario B', async () => {
            const service = new LedgerReconciliationService(sequelize);

            await assert.rejects(
                () => service.reconcile({ userId: testUserA.username, accountId: accountB1.id }),
                (err) => err.code === 'CROSS_USER_ACCESS_DENIED'
            );
        });

        it('invariante de transferencias internas: A -> B altera balances individuales pero mantiene balance consolidado', async () => {
            // Transfer 200.00 DOP (20000 minor) from A1 to A2
            let transferTxId = null;
            await sequelize.transaction(async (t) => {
                const tx = await LedgerTransaction.create({
                    userId: testUserA.username,
                    date: '2026-10-04',
                    type: 'transfer',
                    status: 'cleared',
                    memo: 'Internal savings allocation'
                }, { transaction: t });
                transferTxId = tx.id;

                await TransactionLine.create({
                    transactionId: tx.id,
                    accountId: accountA1.id,
                    amountMinor: -20000n, // Credit A1 (out)
                    currency: 'DOP'
                }, { transaction: t });

                await TransactionLine.create({
                    transactionId: tx.id,
                    accountId: accountA2.id,
                    amountMinor: 20000n, // Debit A2 (in)
                    currency: 'DOP'
                }, { transaction: t });
            });

            // Update cached balances accordingly
            await accountA1.update({ currentBalanceMinor: 80000n });
            await accountA2.update({ currentBalanceMinor: 70000n });

            const service = new LedgerReconciliationService(sequelize);
            const report = await service.reconcile({ userId: testUserA.username });

            assert.equal(report.status, 'HEALTHY');
            assert.equal(report.transferViolationsCount, 0, 'No debe violar invariante de transferencia');

            const userConsolidated = report.consolidatedUsers.find(u => u.userId === testUserA.username);
            assert.ok(userConsolidated);
            // 80000 + 70000 = 150000 (equal to original opening sum: 100000 + 50000)
            assert.equal(userConsolidated.totalCachedMinor, '150000');
            assert.equal(userConsolidated.totalDerivedMinor, '150000');
            assert.equal(userConsolidated.netDifferenceMinor, '0');

            // Cleanup lines and tx within a transaction to satisfy deferred constraint trigger
            await sequelize.transaction(async (t) => {
                await TransactionLine.destroy({ where: { transactionId: transferTxId }, transaction: t });
                await LedgerTransaction.destroy({ where: { id: transferTxId }, transaction: t });
            });
            await accountA1.update({ currentBalanceMinor: 100000n });
            await accountA2.update({ currentBalanceMinor: 50000n });
        });
    });

    // =========================================================================
    // 3. JOB OBSERVABILITY & CONCURRENCY
    // =========================================================================
    describe('3. Job Observability, Concurrency, and Error Sanitization', () => {
        it('previene ejecuciones concurrentes del mismo job retornando status skipped', async () => {
            const obs = new JobObservabilityService(sequelize);

            let resolveFirst;
            const firstPromise = new Promise(res => resolveFirst = res);

            // Start long running job
            const job1 = obs.executeMonitoredJob('test_concurrent_job', async () => {
                await firstPromise;
                return { summary: 'Job 1 finished' };
            });

            // Attempt to trigger same job concurrently
            const job2 = await obs.executeMonitoredJob('test_concurrent_job', async () => {
                return { summary: 'Job 2 finished' };
            });

            assert.equal(job2.status, 'skipped');
            assert.equal(job2.reason, 'CONCURRENT_EXECUTION_IN_PROGRESS');

            resolveFirst();
            const job1Res = await job1;
            assert.equal(job1Res.status, 'success');
        });

        it('sanitiza credenciales, tokens, passwords y urls sensibles en errores', () => {
            const secretLeak = 'Failed to connect: postgresql://admin:super_secret_pwd@db.host:5432/finance with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and apiKey=secret_12345';
            const sanitized = sanitizeErrorMessage(secretLeak);

            assert.ok(!sanitized.includes('super_secret_pwd'), 'Password debe ser removido');
            assert.ok(!sanitized.includes('secret_12345'), 'API Key debe ser removida');
            assert.ok(!sanitized.includes('eyJhbGciOiJIUzI1Ni'), 'Bearer token debe ser removido');
            assert.ok(sanitized.includes('[REDACTED]'), 'Debe reemplazar con [REDACTED]');
        });

        it('sanitiza metadata de jobs recursivamente eliminando claves sensibles', () => {
            const meta = {
                user: 'tester',
                apiKey: 'ak_live_xyz987',
                database: {
                    password: 'mypassword',
                    port: 5432
                }
            };
            const cleaned = sanitizeMetadata(meta);

            assert.equal(cleaned.user, 'tester');
            assert.equal(cleaned.apiKey, '[REDACTED]');
            assert.equal(cleaned.database.password, '[REDACTED]');
            assert.equal(cleaned.database.port, 5432);
        });

        it('expone telemetría agregada de jobs en getHealthTelemetry()', async () => {
            const obs = new JobObservabilityService(sequelize);

            await obs.executeMonitoredJob('telemetry_test_job', async () => {
                return { summary: 'Executed OK', itemsProcessed: 10, failuresCount: 0 };
            });

            const telemetry = await obs.getHealthTelemetry();
            assert.ok(telemetry.monitoredJobsCount >= 1);
            assert.ok(telemetry.jobs['telemetry_test_job']);
            assert.equal(telemetry.jobs['telemetry_test_job'].status, 'success');
        });

        it('previene ejecuciones concurrentes entre instancias distintas usando public.job_leases', async () => {
            const instance1 = new JobObservabilityService(sequelize);
            const instance2 = new JobObservabilityService(sequelize);
            instance1.instanceId = 'node_instance_1:1001';
            instance2.instanceId = 'node_instance_2:1002';

            let resolveFirst;
            const firstPromise = new Promise(res => resolveFirst = res);

            // Instance 1 starts job
            const job1 = instance1.executeMonitoredJob('distributed_test_job', async () => {
                await firstPromise;
                return { summary: 'Instance 1 done' };
            });

            // Allow instance 1 to acquire lease in DB
            await new Promise(r => setTimeout(r, 50));

            // Instance 2 attempts to run the exact same job concurrently
            const job2 = await instance2.executeMonitoredJob('distributed_test_job', async () => {
                return { summary: 'Instance 2 done' };
            });

            assert.equal(job2.status, 'skipped');
            assert.equal(job2.reason, 'CONCURRENT_EXECUTION_IN_PROGRESS');

            resolveFirst();
            const res1 = await job1;
            assert.equal(res1.status, 'success');

            // Verify distributed lease was cleanly released in DB
            const [leases] = await sequelize.query(`
                SELECT * FROM public.job_leases WHERE job_name = 'distributed_test_job';
            `);
            assert.equal(leases.length, 0, 'Lease debe liberarse en finally');
        });

        it('recupera jobs huerfanos en estado running tras un crash / reinicio no controlado', async () => {
            const obs = new JobObservabilityService(sequelize);
            const orphanId = crypto.randomUUID();

            // Simulate orphaned running execution left by a hard crash
            await sequelize.query(`
                INSERT INTO public.job_executions (execution_id, job_name, status, started_at, summary)
                VALUES (:id, 'crashed_worker_job', 'running', CURRENT_TIMESTAMP - INTERVAL '15 minutes', 'Running prior to power cut');
            `, { replacements: { id: orphanId } });

            // Simulate expired lease left by the crashed process
            await sequelize.query(`
                INSERT INTO public.job_leases (job_name, locked_by, locked_at, lease_expires_at, execution_id)
                VALUES ('crashed_worker_job', 'crashed_host:999', CURRENT_TIMESTAMP - INTERVAL '15 minutes', CURRENT_TIMESTAMP - INTERVAL '5 minutes', :id)
                ON CONFLICT (job_name) DO UPDATE
                SET lease_expires_at = CURRENT_TIMESTAMP - INTERVAL '5 minutes';
            `, { replacements: { id: orphanId } });

            const recoveryReport = await obs.recoverCrashedJobsOnStartup();
            assert.ok(recoveryReport.recoveredCount >= 1, 'Debe marcar jobs huerfanos');

            // Verify the orphaned job is now marked failed with proper diagnostics
            const [[recovered]] = await sequelize.query(`
                SELECT status, summary, error_sanitized FROM public.job_executions WHERE execution_id = :id;
            `, { replacements: { id: orphanId } });

            assert.equal(recovered.status, 'failed');
            assert.ok(recovered.summary.includes('abandoned due to abnormal process termination'));
            assert.ok(recovered.error_sanitized.includes('Process crashed'));

            // Verify expired lease was purged
            const [leases] = await sequelize.query(`
                SELECT * FROM public.job_leases WHERE job_name = 'crashed_worker_job';
            `);
            assert.equal(leases.length, 0, 'Lease expirado debe ser eliminado');
        });

        it('purga ejecuciones antiguas o excedentes segun politica de retencion', async () => {
            const obs = new JobObservabilityService(sequelize);
            const purgeJobName = 'retention_test_job';

            // Insert 10 executions
            for (let i = 0; i < 10; i++) {
                await sequelize.query(`
                    INSERT INTO public.job_executions (execution_id, job_name, status, started_at, finished_at, duration_ms, summary)
                    VALUES (:id, :jobName, 'success', CURRENT_TIMESTAMP - (:minutes || ' minutes')::INTERVAL, CURRENT_TIMESTAMP, 100, 'Batch run');
                `, {
                    replacements: {
                        id: crypto.randomUUID(),
                        jobName: purgeJobName,
                        minutes: String((10 - i) * 10)
                    }
                });
            }

            // Purge with maxPerJob = 3
            const purgeResult = await obs.purgeOldExecutions({ retentionDays: 30, maxPerJob: 3 });
            assert.equal(purgeResult.success, true);

            const [remaining] = await sequelize.query(`
                SELECT id FROM public.job_executions WHERE job_name = :jobName;
            `, { replacements: { jobName: purgeJobName } });

            assert.equal(remaining.length, 3, 'Debe mantener unicamente las 3 ejecuciones mas recientes');
        });
    });

    // =========================================================================
    // 4. HEALTH CHECK PROBES
    // =========================================================================
    describe('4. Health Check Probes (Liveness, Readiness, Deep Health)', () => {
        it('liveness responde 200 UP sin depender de servicios externos', () => {
            let statusCode = null;
            let payload = null;
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { payload = data; return res; }
            };

            getLiveness({}, res);

            assert.equal(statusCode, 200);
            assert.equal(payload.status, 'UP');
            assert.ok(payload.uptimeSeconds >= 0);
        });

        it('readiness responde 200 READY cuando DB, migraciones y schema están sincronizados', async () => {
            let statusCode = null;
            let payload = null;
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { payload = data; return res; }
            };

            await getReadiness({}, res);

            assert.equal(statusCode, 200);
            assert.equal(payload.status, 'READY');
            assert.equal(payload.checks.database, true);
            assert.equal(payload.checks.migrations, true);
            assert.equal(payload.checks.schemaDrift, true);
        });

        it('deep health reporta estado consolidado sin filtrar secretos', async () => {
            let statusCode = null;
            let payload = null;
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { payload = data; return res; }
            };

            await getDeepHealth({}, res);

            assert.ok(statusCode === 200 || statusCode === 503);
            assert.ok(['HEALTHY', 'DEGRADED', 'UNHEALTHY'].includes(payload.status));
            assert.ok(payload.services.database);
            assert.ok(payload.services.migrations);
            assert.ok(payload.services.schemaDrift);
            assert.ok(payload.services.ledgerReconciliation);
            assert.ok(payload.services.jobObservability);
            assert.ok(payload.system.nodeVersion);

            // Security verification: no sensitive strings leaked
            const rawJson = JSON.stringify(payload);
            assert.ok(!rawJson.includes('magnus_test_secret_pass'));
            assert.ok(!rawJson.includes('DATABASE_URL'));
        });
    });

    // =========================================================================
    // 5. BIGINT NUMERICAL SAFETY & ADVERSARIAL MONEY TESTS
    // =========================================================================
    describe('5. BIGINT Numerical Safety & Adversarial Conversions', () => {
        it('toMinorUnitsBigInt maneja cero, negativos, decimales y strings exactos', () => {
            assert.equal(toMinorUnitsBigInt(0), 0n);
            assert.equal(toMinorUnitsBigInt('0'), 0n);
            assert.equal(toMinorUnitsBigInt('0.00'), 0n);
            assert.equal(toMinorUnitsBigInt(null), 0n);
            assert.equal(toMinorUnitsBigInt(undefined), 0n);
            assert.equal(toMinorUnitsBigInt(''), 0n);

            assert.equal(toMinorUnitsBigInt('123.45'), 12345n);
            assert.equal(toMinorUnitsBigInt('-123.45'), -12345n);
            assert.equal(toMinorUnitsBigInt('0.05'), 5n);
            assert.equal(toMinorUnitsBigInt('0.5'), 50n);
            assert.equal(toMinorUnitsBigInt('100'), 10000n);
        });

        it('toMinorUnitsBigInt procesa montos mayores a MAX_SAFE_INTEGER sin truncamiento', () => {
            // 90,071,992,547,409.91 DOP = 9,007,199,254,740,991 minor units (Number.MAX_SAFE_INTEGER)
            const safeMaxMinor = 9007199254740991n;
            assert.equal(toMinorUnitsBigInt('90071992547409.91'), safeMaxMinor);

            // 1 cent above Number.MAX_SAFE_INTEGER
            const beyondSafe = 9007199254740992n;
            assert.equal(toMinorUnitsBigInt('90071992547409.92'), beyondSafe);
        });

        it('toMinorUnitsBigInt valida límites de PostgreSQL BIGINT e impide overflow', () => {
            const pgBigintMax = 9223372036854775807n;
            const pgBigintMin = -9223372036854775808n;

            assert.equal(toMinorUnitsBigInt(pgBigintMax), pgBigintMax);
            assert.equal(toMinorUnitsBigInt(pgBigintMin), pgBigintMin);

            // Overflow by 1 unit
            assert.throws(() => toMinorUnitsBigInt(pgBigintMax + 1n), RangeError);
            assert.throws(() => toMinorUnitsBigInt(pgBigintMin - 1n), RangeError);
            assert.throws(() => toMinorUnitsBigInt('92233720368547759.00'), RangeError);
        });

        it('toMinorUnitsBigInt rechaza formatos inválidos, NaN e Infinity con TypeError', () => {
            assert.throws(() => toMinorUnitsBigInt('NaN'), TypeError);
            assert.throws(() => toMinorUnitsBigInt('Infinity'), TypeError);
            assert.throws(() => toMinorUnitsBigInt('-Infinity'), TypeError);
            assert.throws(() => toMinorUnitsBigInt('123.45.67'), TypeError);
            assert.throws(() => toMinorUnitsBigInt('abc'), TypeError);
            assert.throws(() => toMinorUnitsBigInt('12$'), TypeError);
        });

        it('minorUnitsToSafeNumber lanza RangeError ante valores fuera de safe integer', () => {
            assert.equal(minorUnitsToSafeNumber(10000n), 100);
            assert.equal(minorUnitsToSafeNumber('12345'), 123.45);
            assert.equal(minorUnitsToSafeNumber(-5000n), -50);

            // Beyond safe integer throws RangeError to protect caller from silent cent loss
            const unsafeMinor = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
            assert.throws(() => minorUnitsToSafeNumber(unsafeMinor), RangeError);
        });
    });
});
