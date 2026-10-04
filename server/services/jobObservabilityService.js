/**
 * MAGNUSOS2 — JOB OBSERVABILITY SERVICE (Phase II-D)
 * Comprehensive tracking, health telemetry, and concurrency governance for scheduled jobs.
 *
 * Guarantees:
 * 1. Safe Error Handling: Sanitizes credentials, secrets, tokens, and database URIs.
 * 2. Concurrency Protection: Prevents overlapping runs of identical jobs.
 * 3. Resilient Persistence: Stores executions in PostgreSQL when available, maintains in-memory telemetry if DB table is pending.
 * 4. Automatic Stale Detection: Resets and flags abandoned/crashed 'running' states.
 * 5. Retention Control: Prunes historical runs to avoid unbounded table growth.
 */

import crypto from 'node:crypto';
import { sequelize } from '../models/index.js';

const SENSITIVE_PATTERNS = [
    /password=[^&;\s]+/gi,
    /bearer\s+[a-zA-Z0-9_\-\.]+/gi,
    /api[_\-]?key=[^&;\s]+/gi,
    /secret=[^&;\s]+/gi,
    /token=[^&;\s]+/gi,
    /postgresql:\/\/[^:]+:[^@]+@[^/]+/gi,
    /https?:\/\/[^:]+:[^@]+@[^/]+/gi
];

export function sanitizeErrorMessage(message) {
    if (!message) return null;
    let sanitized = String(message);
    for (const pattern of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    // Remove file paths and stack traces
    sanitized = sanitized.split('\n')[0].trim();
    if (sanitized.length > 500) {
        sanitized = sanitized.slice(0, 497) + '...';
    }
    return sanitized;
}

export function sanitizeMetadata(meta) {
    if (!meta || typeof meta !== 'object') return null;
    try {
        const copy = JSON.parse(JSON.stringify(meta));
        const clean = (obj) => {
            for (const key of Object.keys(obj)) {
                const lower = key.toLowerCase();
                if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('key')) {
                    obj[key] = '[REDACTED]';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    clean(obj[key]);
                } else if (typeof obj[key] === 'string') {
                    obj[key] = sanitizeErrorMessage(obj[key]);
                }
            }
        };
        clean(copy);
        return copy;
    } catch (_) {
        return null;
    }
}

export class JobObservabilityService {
    constructor(db = sequelize) {
        this.sequelize = db;
        // In-memory active locks: jobName -> { executionId, startedAt, timeoutMs }
        this.activeLocks = new Map();
        // In-memory telemetry cache for quick health check reads
        this.telemetryCache = new Map();
        this.tableExists = null;
    }

    async #checkTableExists() {
        if (this.tableExists !== null) return this.tableExists;
        try {
            if (this.sequelize.getDialect() === 'postgres') {
                const [[res]] = await this.sequelize.query(
                    "SELECT to_regclass('public.job_executions') AS reg;"
                );
                this.tableExists = Boolean(res?.reg);
            } else {
                const [res] = await this.sequelize.query(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='job_executions';"
                );
                this.tableExists = res.length > 0;
            }
        } catch (_) {
            this.tableExists = false;
        }
        return this.tableExists;
    }

    /**
     * Executes a job with automatic lifecycle telemetry, concurrency guard, and sanitized reporting.
     * @param {string} jobName
     * @param {Function} runnerFn - async (context) => { summary, itemsProcessed, failuresCount, metadata }
     * @param {Object} [options]
     * @param {number} [options.timeoutMs=600000] - 10 minutes default timeout
     * @param {Object} [options.initialMetadata={}]
     * @returns {Promise<Object>} Execution result
     */
    async executeMonitoredJob(jobName, runnerFn, { timeoutMs = 600000, initialMetadata = {} } = {}) {
        const now = Date.now();
        const executionId = crypto.randomUUID();

        // 1. Concurrency Check
        const existingLock = this.activeLocks.get(jobName);
        if (existingLock) {
            const elapsed = now - existingLock.startedAt;
            if (elapsed < (existingLock.timeoutMs || timeoutMs)) {
                // Legitimate running execution in progress: Skip
                await this.#recordSkipped(jobName, executionId, 'Skipped due to concurrent execution in progress');
                return {
                    executionId,
                    jobName,
                    status: 'skipped',
                    reason: 'CONCURRENT_EXECUTION_IN_PROGRESS',
                    durationMs: 0
                };
            } else {
                // Abandoned / timed-out execution: Mark previous as failed
                await this.#recordTimeout(jobName, existingLock.executionId, elapsed);
                this.activeLocks.delete(jobName);
            }
        }

        // Acquire lock
        this.activeLocks.set(jobName, { executionId, startedAt: now, timeoutMs });
        await this.#recordStart(jobName, executionId, initialMetadata);

        try {
            const output = await runnerFn({ executionId, jobName });
            const finishedAt = Date.now();
            const durationMs = finishedAt - now;

            const summary = typeof output === 'string' ? output : (output?.summary || 'Completed successfully');
            const itemsProcessed = Number(output?.itemsProcessed || 0);
            const failuresCount = Number(output?.failuresCount || 0);
            const metadata = sanitizeMetadata(output?.metadata || initialMetadata);

            const result = {
                executionId,
                jobName,
                status: 'success',
                startedAt: new Date(now).toISOString(),
                finishedAt: new Date(finishedAt).toISOString(),
                durationMs,
                summary: summary.slice(0, 500),
                itemsProcessed,
                failuresCount,
                metadata
            };

            await this.#recordSuccess(result);
            return result;

        } catch (error) {
            const finishedAt = Date.now();
            const durationMs = finishedAt - now;
            const sanitizedError = sanitizeErrorMessage(error.message);

            const failureResult = {
                executionId,
                jobName,
                status: 'failed',
                startedAt: new Date(now).toISOString(),
                finishedAt: new Date(finishedAt).toISOString(),
                durationMs,
                summary: `Failed: ${sanitizedError}`.slice(0, 500),
                errorSanitized: sanitizedError,
                itemsProcessed: 0,
                failuresCount: 1,
                metadata: sanitizeMetadata(initialMetadata)
            };

            await this.#recordFailure(failureResult);
            throw error;

        } finally {
            this.activeLocks.delete(jobName);
        }
    }

    async #recordStart(jobName, executionId, metadata) {
        const record = {
            executionId,
            jobName,
            status: 'running',
            startedAt: new Date().toISOString(),
            metadata: sanitizeMetadata(metadata)
        };
        this.telemetryCache.set(jobName, {
            ...this.telemetryCache.get(jobName),
            currentExecution: record
        });

        if (await this.#checkTableExists()) {
            try {
                await this.sequelize.query(`
                    INSERT INTO public.job_executions 
                        (execution_id, job_name, status, started_at, metadata)
                    VALUES 
                        (:executionId, :jobName, 'running', CURRENT_TIMESTAMP, :metadata);
                `, {
                    replacements: {
                        executionId,
                        jobName,
                        metadata: JSON.stringify(record.metadata || {})
                    }
                });
            } catch (_) {}
        }
    }

    async #recordSuccess(result) {
        const stats = this.telemetryCache.get(result.jobName) || {};
        this.telemetryCache.set(result.jobName, {
            ...stats,
            currentExecution: null,
            lastExecution: result,
            lastSuccessAt: result.finishedAt,
            consecutiveFailures: 0
        });

        if (await this.#checkTableExists()) {
            try {
                await this.sequelize.query(`
                    UPDATE public.job_executions 
                    SET 
                        status = 'success',
                        finished_at = CURRENT_TIMESTAMP,
                        duration_ms = :durationMs,
                        summary = :summary,
                        items_processed = :itemsProcessed,
                        failures_count = :failuresCount,
                        metadata = :metadata
                    WHERE execution_id = :executionId;
                `, {
                    replacements: {
                        executionId: result.executionId,
                        durationMs: result.durationMs,
                        summary: result.summary,
                        itemsProcessed: result.itemsProcessed,
                        failuresCount: result.failuresCount,
                        metadata: JSON.stringify(result.metadata || {})
                    }
                });
            } catch (_) {}
        }
    }

    async #recordFailure(result) {
        const stats = this.telemetryCache.get(result.jobName) || {};
        this.telemetryCache.set(result.jobName, {
            ...stats,
            currentExecution: null,
            lastExecution: result,
            lastFailureAt: result.finishedAt,
            consecutiveFailures: (stats.consecutiveFailures || 0) + 1
        });

        if (await this.#checkTableExists()) {
            try {
                await this.sequelize.query(`
                    UPDATE public.job_executions 
                    SET 
                        status = 'failed',
                        finished_at = CURRENT_TIMESTAMP,
                        duration_ms = :durationMs,
                        summary = :summary,
                        error_sanitized = :errorSanitized,
                        items_processed = :itemsProcessed,
                        failures_count = :failuresCount,
                        metadata = :metadata
                    WHERE execution_id = :executionId;
                `, {
                    replacements: {
                        executionId: result.executionId,
                        durationMs: result.durationMs,
                        summary: result.summary,
                        errorSanitized: result.errorSanitized,
                        itemsProcessed: result.itemsProcessed,
                        failuresCount: result.failuresCount,
                        metadata: JSON.stringify(result.metadata || {})
                    }
                });
            } catch (_) {}
        }
    }

    async #recordSkipped(jobName, executionId, reason) {
        if (await this.#checkTableExists()) {
            try {
                await this.sequelize.query(`
                    INSERT INTO public.job_executions 
                        (execution_id, job_name, status, started_at, finished_at, duration_ms, summary)
                    VALUES 
                        (:executionId, :jobName, 'skipped', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, :summary);
                `, {
                    replacements: {
                        executionId,
                        jobName,
                        summary: reason
                    }
                });
            } catch (_) {}
        }
    }

    async #recordTimeout(jobName, executionId, elapsedMs) {
        if (await this.#checkTableExists()) {
            try {
                await this.sequelize.query(`
                    UPDATE public.job_executions 
                    SET 
                        status = 'failed',
                        finished_at = CURRENT_TIMESTAMP,
                        duration_ms = :durationMs,
                        summary = 'Execution timed out / abandoned',
                        error_sanitized = 'Timeout exceeded'
                    WHERE execution_id = :executionId AND status = 'running';
                `, {
                    replacements: { executionId, durationMs: elapsedMs }
                });
            } catch (_) {}
        }
    }

    /**
     * Telemetry read API for Healthcheck and Monitoring
     */
    async getHealthTelemetry() {
        const hasTable = await this.#checkTableExists();
        const summary = {};

        // Merge DB stats if table exists
        if (hasTable) {
            try {
                const [rows] = await this.sequelize.query(`
                    SELECT DISTINCT ON (job_name)
                        job_name,
                        status,
                        started_at,
                        finished_at,
                        duration_ms,
                        summary,
                        error_sanitized
                    FROM public.job_executions
                    ORDER BY job_name, started_at DESC;
                `);

                for (const row of rows) {
                    summary[row.job_name] = {
                        status: row.status,
                        lastRun: row.started_at,
                        durationMs: row.duration_ms,
                        summary: row.summary,
                        hasError: row.status === 'failed',
                        errorSanitized: row.error_sanitized
                    };
                }
            } catch (_) {}
        }

        // Overlay in-memory active locks
        for (const [jobName, lock] of this.activeLocks.entries()) {
            summary[jobName] = {
                ...(summary[jobName] || {}),
                status: 'running',
                runningSince: new Date(lock.startedAt).toISOString(),
                elapsedMs: Date.now() - lock.startedAt
            };
        }

        // Overlay in-memory cache for jobs run before DB persistence
        for (const [jobName, stats] of this.telemetryCache.entries()) {
            if (!summary[jobName]) {
                summary[jobName] = {
                    status: stats.lastExecution?.status || 'unknown',
                    lastRun: stats.lastExecution?.finishedAt || null,
                    durationMs: stats.lastExecution?.durationMs || null,
                    summary: stats.lastExecution?.summary || null,
                    consecutiveFailures: stats.consecutiveFailures || 0
                };
            }
        }

        return {
            storage: hasTable ? 'POSTGRESQL' : 'IN_MEMORY',
            activeRunningCount: this.activeLocks.size,
            monitoredJobsCount: Object.keys(summary).length,
            jobs: summary
        };
    }

    /**
     * Data retention policy: Purges execution logs older than retentionDays
     * and keeps at most maxPerJob runs per job.
     */
    async purgeOldExecutions({ retentionDays = 30, maxPerJob = 100 } = {}) {
        if (!(await this.#checkTableExists())) return { purgedCount: 0 };
        try {
            // 1. Delete by age
            const [ageResult] = await this.sequelize.query(`
                DELETE FROM public.job_executions 
                WHERE started_at < CURRENT_TIMESTAMP - INTERVAL '${parseInt(retentionDays, 10)} days';
            `);

            // 2. Delete excess beyond maxPerJob
            await this.sequelize.query(`
                DELETE FROM public.job_executions
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (PARTITION BY job_name ORDER BY started_at DESC) as r_num
                        FROM public.job_executions
                    ) ranked
                    WHERE ranked.r_num > :maxPerJob
                );
            `, {
                replacements: { maxPerJob: parseInt(maxPerJob, 10) }
            });

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}

export const jobObservability = new JobObservabilityService();
