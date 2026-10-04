/**
 * MAGNUSOS2 — HEALTH CONTROLLER (Phase II-D)
 * Three-tier health checks with zero credential leakage:
 * 1. Liveness: Fast process heartbeat, independent of non-essential services.
 * 2. Readiness: Verifies DB connectivity, migration completeness, checksums, and schema drift.
 * 3. Deep Health: Protected endpoint reporting diagnostics, jobs observability, and ledger reconciliation.
 */

import { sequelize } from '../config/database.js';
import { fxService } from '../services/fx/fxService.js';
import { MigrationRunner } from '../services/migrationRunner.js';
import { SchemaDriftService } from '../services/schemaDriftService.js';
import { LedgerReconciliationService } from '../services/ledgerReconciliationService.js';
import { jobObservability, sanitizeErrorMessage } from '../services/jobObservabilityService.js';

let lastReconciliationCache = null;
let lastReconciliationTime = 0;
const RECONCILIATION_CACHE_TTL_MS = 60000; // 1 minute

/**
 * 1. Liveness Probe
 * GET /health/live, GET /api/health/liveness
 * Fast process heartbeat, no external dependencies.
 */
export const getLiveness = (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        version: '2.0.0'
    });
};

/**
 * 2. Readiness Probe
 * GET /health/ready, GET /api/health/readiness
 * Fails (503) if DB is unavailable, migrations pending, checksum invalid, or schema drift detected.
 */
export const getReadiness = async (req, res) => {
    const checks = {
        database: false,
        migrations: false,
        schemaDrift: false
    };
    const errors = [];

    // Check DB connection
    const dbStart = Date.now();
    try {
        await sequelize.authenticate();
        checks.database = true;
    } catch (err) {
        errors.push(`Database connection failed: ${sanitizeErrorMessage(err.message)}`);
    }

    // Check Migration State
    if (checks.database) {
        try {
            const runner = new MigrationRunner(sequelize);
            const status = await runner.status();
            const pending = status.filter(m => !m.applied);
            const invalidChecksums = status.filter(m => m.applied && m.checksumMatches !== true);

            if (pending.length > 0) {
                errors.push(`Pending migrations detected: ${pending.map(p => p.name).join(', ')}`);
            } else if (invalidChecksums.length > 0) {
                errors.push(`Invalid migration checksums detected: ${invalidChecksums.map(i => i.name).join(', ')}`);
            } else {
                checks.migrations = true;
            }
        } catch (err) {
            errors.push(`Migration status check failed: ${sanitizeErrorMessage(err.message)}`);
        }
    }

    // Check Schema Drift
    if (checks.database && checks.migrations) {
        try {
            const driftService = new SchemaDriftService(sequelize);
            const drift = await driftService.audit();
            if (!drift.isSynced) {
                errors.push(`Critical schema drift detected: ${drift.summary}`);
            } else {
                checks.schemaDrift = true;
            }
        } catch (err) {
            errors.push(`Schema drift audit failed: ${sanitizeErrorMessage(err.message)}`);
        }
    }

    const isReady = checks.database && checks.migrations && checks.schemaDrift;
    const responsePayload = {
        status: isReady ? 'READY' : 'NOT_READY',
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - dbStart,
        checks,
        reasons: errors.length > 0 ? errors : undefined
    };

    res.status(isReady ? 200 : 503).json(responsePayload);
};

/**
 * 3. Deep Health Probe (Authenticated)
 * GET /health/deep, GET /api/health/deep
 * Protected diagnostic endpoint with full topology, reconciliation, and job observability telemetry.
 */
export const getDeepHealth = async (req, res) => {
    const startTime = Date.now();
    let overallStatus = 'HEALTHY';
    const warnings = [];
    const errors = [];

    const report = {
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        version: process.env.APP_VERSION || '2.0.0',
        commit: process.env.GIT_COMMIT || 'de7e04e',
        services: {
            database: { status: 'UNKNOWN' },
            migrations: { status: 'UNKNOWN' },
            schemaDrift: { status: 'UNKNOWN' },
            ledgerReconciliation: { status: 'UNKNOWN' },
            jobObservability: { status: 'UNKNOWN' },
            sandbox: { status: 'UNKNOWN' },
            fxCache: { status: 'UNKNOWN' }
        },
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            memory: {
                heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024)
            }
        }
    };

    // 1. Database & Migrations & Drift
    try {
        const dbStart = Date.now();
        await sequelize.authenticate();
        const dbLatency = Date.now() - dbStart;

        report.services.database = {
            status: 'HEALTHY',
            dialect: sequelize.getDialect(),
            latencyMs: dbLatency
        };

        const runner = new MigrationRunner(sequelize);
        const status = await runner.status();
        const pending = status.filter(m => !m.applied);
        const invalid = status.filter(m => m.applied && m.checksumMatches !== true);

        if (pending.length > 0 || invalid.length > 0) {
            report.services.migrations = {
                status: 'UNHEALTHY',
                total: status.length,
                applied: status.length - pending.length,
                pendingCount: pending.length,
                pendingNames: pending.map(p => p.name),
                invalidChecksumCount: invalid.length
            };
            overallStatus = 'UNHEALTHY';
            errors.push('Migrations incomplete or corrupted');
        } else {
            report.services.migrations = {
                status: 'HEALTHY',
                total: status.length,
                applied: status.length,
                pendingCount: 0,
                allChecksumsValid: true
            };
        }

        const driftService = new SchemaDriftService(sequelize);
        const drift = await driftService.audit();
        if (!drift.isSynced) {
            report.services.schemaDrift = {
                status: 'UNHEALTHY',
                isSynced: false,
                summary: drift.summary,
                missingTables: drift.missingTables?.length || 0,
                missingColumns: drift.missingColumns?.length || 0,
                typeMismatches: drift.typeMismatches?.length || 0
            };
            overallStatus = 'UNHEALTHY';
            errors.push('Schema drift detected');
        } else {
            report.services.schemaDrift = {
                status: 'HEALTHY',
                isSynced: true,
                auditedColumnsCount: drift.auditedColumnsCount
            };
        }

    } catch (dbErr) {
        report.services.database = {
            status: 'UNHEALTHY',
            error: sanitizeErrorMessage(dbErr.message)
        };
        overallStatus = 'UNHEALTHY';
        errors.push('Database unreachable');
    }

    // 2. Ledger Reconciliation Telemetry (Cached or Run)
    if (report.services.database.status === 'HEALTHY') {
        try {
            const now = Date.now();
            if (!lastReconciliationCache || (now - lastReconciliationTime > RECONCILIATION_CACHE_TTL_MS)) {
                const reconService = new LedgerReconciliationService(sequelize);
                lastReconciliationCache = await reconService.reconcile();
                lastReconciliationTime = now;
            }

            const recon = lastReconciliationCache;
            report.services.ledgerReconciliation = {
                status: recon.isReconciled ? 'HEALTHY' : 'DEGRADED',
                lastCheckedAt: recon.timestamp,
                accountsAudited: recon.accountsAuditedCount,
                accountsReconciled: recon.accountsReconciledCount,
                discrepanciesCount: recon.discrepanciesCount,
                securityViolationsCount: recon.securityViolationsCount
            };

            if (!recon.isReconciled) {
                if (overallStatus !== 'UNHEALTHY') overallStatus = 'DEGRADED';
                warnings.push(`Ledger reconciliation active alerts: ${recon.discrepanciesCount} accounts with discrepancy`);
            }
        } catch (reconErr) {
            report.services.ledgerReconciliation = {
                status: 'DEGRADED',
                error: sanitizeErrorMessage(reconErr.message)
            };
            if (overallStatus !== 'UNHEALTHY') overallStatus = 'DEGRADED';
            warnings.push('Ledger reconciliation check failed');
        }
    }

    // 3. Job Observability Telemetry
    try {
        const jobTelemetry = await jobObservability.getHealthTelemetry();
        report.services.jobObservability = {
            status: 'HEALTHY',
            storage: jobTelemetry.storage,
            activeRunningCount: jobTelemetry.activeRunningCount,
            monitoredJobsCount: jobTelemetry.monitoredJobsCount,
            jobs: jobTelemetry.jobs
        };
    } catch (jobErr) {
        report.services.jobObservability = {
            status: 'DEGRADED',
            error: sanitizeErrorMessage(jobErr.message)
        };
        if (overallStatus !== 'UNHEALTHY') overallStatus = 'DEGRADED';
        warnings.push('Job observability telemetry unavailable');
    }

    // 4. Sandbox Check (Short timeout, optional internal service)
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const sandboxRes = await fetch('http://sandbox:5000/health', { signal: controller.signal });
        clearTimeout(timeout);
        report.services.sandbox = { status: sandboxRes.ok ? 'HEALTHY' : 'DEGRADED' };
        if (!sandboxRes.ok && overallStatus === 'HEALTHY') overallStatus = 'DEGRADED';
    } catch (sandboxErr) {
        report.services.sandbox = { status: 'UNREACHABLE' };
        // Sandbox unreachable does not bring entire app down, marks degraded
        if (overallStatus === 'HEALTHY') overallStatus = 'DEGRADED';
        warnings.push('Sandbox bridge is unreachable');
    }

    // 5. FX Cache Check
    try {
        const usdDop = fxService?.cache?.get('USD/DOP');
        report.services.fxCache = {
            status: 'HEALTHY',
            pairsCached: fxService?.cache?.size || 0,
            hasUsdDop: !!usdDop
        };
    } catch (fxErr) {
        report.services.fxCache = { status: 'DEGRADED', error: sanitizeErrorMessage(fxErr.message) };
        if (overallStatus === 'HEALTHY') overallStatus = 'DEGRADED';
    }

    report.status = overallStatus;
    report.warnings = warnings.length > 0 ? warnings : undefined;
    report.errors = errors.length > 0 ? errors : undefined;
    report.durationMs = Date.now() - startTime;

    const httpCode = overallStatus === 'UNHEALTHY' ? 503 : 200;
    res.status(httpCode).json(report);
};

// Legacy alias for compatibility with existing tests
export const getHealth = getLiveness;
