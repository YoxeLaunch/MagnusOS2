import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from '../../server/models/index.js';

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
            const [tables] = await sequelize.query(`
                SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'ledger_transactions';
            `);

            if (tables.length === 0) {
                // 1. Force sync all Sequelize models onto test PostgreSQL
                await sequelize.sync({ force: true });
            }

            // 2. Always apply migration 001: Constraint trigger for double entry & ownership
            const migration001Path = path.join(ROOT_DIR, 'server', 'migrations', '001_ledger_balance_constraint_trigger.sql');
            const sql001 = fs.readFileSync(migration001Path, 'utf8');
            await sequelize.query(sql001);

            // 3. Always apply migration 003: Monthly snapshots user isolation
            const migration003Path = path.join(ROOT_DIR, 'server', 'migrations', '003_monthly_snapshots_user_id.sql');
            if (fs.existsSync(migration003Path)) {
                const sql003 = fs.readFileSync(migration003Path, 'utf8');
                await sequelize.query(sql003).catch(() => {});
            }
        } finally {
            await sequelize.query('SELECT pg_advisory_unlock(987654321);').catch(() => {});
        }

        return true;
    })();

    return initPromise;
}
