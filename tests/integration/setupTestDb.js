import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize, MigrationRunner } from '../../server/models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');

export const TEST_DB_URL = process.env.DATABASE_URL_TEST || 'postgresql://magnus_test_user:magnus_test_secret_pass@127.0.0.1:5433/magnus_test';

export function assertSafeTestEnvironment(url = TEST_DB_URL) {
    if (!url) {
        throw new Error('[GUARDRAIL] Fatal: DATABASE_URL_TEST is not configured.');
    }

    const parsed = new URL(url);
    const dbName = parsed.pathname.replace(/^\//, '');
    const user = parsed.username;
    const port = parsed.port;
    const host = parsed.hostname;

    if (dbName !== 'magnus_test') {
        throw new Error(`[GUARDRAIL] Fatal: Refusing to run tests against '${dbName}'. Test database must strictly be 'magnus_test'.`);
    }

    if (user === 'magnus' || user === 'magnus_app') {
        throw new Error(`[GUARDRAIL] Fatal: Refusing to run tests with production user '${user}'. Must use isolated 'magnus_test_user'.`);
    }

    if (host === 'postgres' || (host === 'localhost' && port === '5432')) {
        throw new Error(`[GUARDRAIL] Fatal: Refusing to run tests against production PostgreSQL host/port (${host}:${port}).`);
    }

    return true;
}

export { sequelize };

let initPromise = null;

export async function initializeTestPostgres() {
    assertSafeTestEnvironment(TEST_DB_URL);

    if (initPromise) {
        return initPromise;
    }

    initPromise = (async () => {
        // Use an advisory lock in PostgreSQL so multiple concurrent test processes never collide on DDL
        await sequelize.query('SELECT pg_advisory_lock(987654321);');

        try {
            // Apply all versioned migrations via MigrationRunner (Migration-First)
            const runner = new MigrationRunner(sequelize);
            await runner.up();
        } finally {
            await sequelize.query('SELECT pg_advisory_unlock(987654321);').catch(() => {});
        }

        return true;
    })();

    return initPromise;
}
