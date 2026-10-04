import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { sequelize } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const ADVISORY_LOCK_ID = 987654321;
const BASELINE_MIGRATION = '000_base_schema.sql';
const PG_BIGINT_MAX = '9223372036854775807';

export class MigrationRunner {
    constructor(db = sequelize) {
        this.sequelize = db;
        this.dialect = db.getDialect();
    }

    static computeChecksum(content) {
        return crypto.createHash('sha256').update(content.trim()).digest('hex');
    }

    getMigrationFiles() {
        if (!fs.existsSync(MIGRATIONS_DIR)) return [];
        return fs.readdirSync(MIGRATIONS_DIR)
            .filter(file => file.endsWith('.sql'))
            .sort((a, b) => a.localeCompare(b));
    }

    async #queryRows(sql, bind = [], connection = null) {
        if (connection) {
            const result = await connection.query(sql, bind);
            return result.rows || [];
        }
        const [rows] = await this.sequelize.query(sql, { bind });
        return rows;
    }

    async #migrationTableExists(connection = null) {
        if (this.dialect !== 'postgres') {
            const rows = await this.#queryRows(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
                [],
                connection
            );
            return rows.length > 0;
        }
        const rows = await this.#queryRows(
            "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists",
            [],
            connection
        );
        return rows[0]?.exists === true;
    }

    async ensureMigrationsTable(connection = null) {
        const sql = this.dialect === 'postgres'
            ? `CREATE TABLE IF NOT EXISTS public.schema_migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                checksum VARCHAR(64) NOT NULL
            )`
            : `CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                checksum TEXT NOT NULL
            )`;
        if (connection) await connection.query(sql);
        else await this.sequelize.query(sql);
    }

    async getAppliedMigrations({ connection = null, createIfMissing = false } = {}) {
        const exists = await this.#migrationTableExists(connection);
        if (!exists) {
            if (!createIfMissing) return [];
            await this.ensureMigrationsTable(connection);
        }
        const table = this.dialect === 'postgres' ? 'public.schema_migrations' : 'schema_migrations';
        return this.#queryRows(
            `SELECT name, applied_at, checksum FROM ${table} ORDER BY id ASC`,
            [],
            connection
        );
    }

    async status({ connection = null } = {}) {
        const files = this.getMigrationFiles();
        const appliedRows = await this.getAppliedMigrations({ connection });
        const appliedMap = new Map(appliedRows.map(row => [row.name, row]));
        const entries = files.map(name => {
            const row = appliedMap.get(name);
            const content = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
            const currentChecksum = MigrationRunner.computeChecksum(content);
            return {
                name,
                applied: Boolean(row),
                appliedAt: row?.applied_at || null,
                recordedChecksum: row?.checksum || null,
                currentChecksum,
                checksumMatches: row ? Boolean(row.checksum) && row.checksum === currentChecksum : null,
                missingFile: false
            };
        });
        for (const row of appliedRows) {
            if (!files.includes(row.name)) {
                entries.push({
                    name: row.name,
                    applied: true,
                    appliedAt: row.applied_at,
                    recordedChecksum: row.checksum,
                    currentChecksum: null,
                    checksumMatches: false,
                    missingFile: true
                });
            }
        }
        return entries;
    }

    #assertImmutableHistory(statusList) {
        const invalid = statusList.filter(item => item.applied && item.checksumMatches !== true);
        if (invalid.length > 0) {
            const details = invalid.map(item => `${item.name}:${item.missingFile ? 'FILE_MISSING' : 'CHECKSUM_MISMATCH'}`);
            throw new Error(`Migration history integrity failure: ${details.join(', ')}`);
        }
    }

    async assertUpToDate() {
        const statusList = await this.status();
        this.#assertImmutableHistory(statusList);
        const pending = statusList.filter(item => !item.applied);
        if (pending.length > 0) {
            throw new Error(`Pending migrations require explicit operator action: ${pending.map(item => item.name).join(', ')}`);
        }
        return statusList;
    }

    async #exactMoneyPreflight(connection) {
        const specs = [
            { table: 'DailyTransactions', legacy: ['amount'], exact: ['amount_minor'], scale: 2, nullable: [] },
            { table: 'Transactions', legacy: ['amount'], exact: ['amount_minor'], scale: 2, nullable: [] },
            { table: 'WealthSnapshots', legacy: ['netWorth', 'assets', 'liabilities'], exact: ['net_worth_minor', 'assets_minor', 'liabilities_minor'], scale: 2, nullable: ['assets', 'liabilities'] },
            { table: 'CurrencyHistories', legacy: ['rate'], exact: ['rate_exact'], scale: 6, nullable: [], numericExact: true }
        ];
        const anomalies = [];
        for (const spec of specs) {
            const reg = await this.#queryRows('SELECT to_regclass($1) AS reg', [`public."${spec.table}"`], connection);
            if (!reg[0]?.reg) continue;
            const columns = await this.#queryRows(
                "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",
                [spec.table],
                connection
            );
            const present = new Set(columns.map(row => row.column_name));
            for (let index = 0; index < spec.legacy.length; index += 1) {
                const legacy = spec.legacy[index];
                const exact = spec.exact[index];
                if (!present.has(legacy)) continue;
                const legacyQuoted = `"${legacy.replaceAll('"', '""')}"`;
                const multiplier = spec.scale === 2 ? '100' : '1000000';
                const expected = spec.numericExact
                    ? `ROUND(${legacyQuoted}::numeric, ${spec.scale})`
                    : `ROUND((COALESCE(${legacyQuoted}, 0) * ${multiplier})::numeric)::bigint`;
                const rangeViolation = spec.numericExact
                    ? `ABS(${legacyQuoted}::numeric) >= 1000000::numeric`
                    : `ABS((${legacyQuoted} * ${multiplier})::numeric) > ${PG_BIGINT_MAX}::numeric`;
                const nullViolation = spec.nullable.includes(legacy) ? 'false' : `${legacyQuoted} IS NULL`;
                const exactMismatch = present.has(exact)
                    ? `OR CASE
                           WHEN ${legacyQuoted} IS NULL OR ${legacyQuoted}::text IN ('NaN', 'Infinity', '-Infinity') THEN false
                           ELSE "${exact}" IS NOT NULL AND "${exact}" IS DISTINCT FROM ${expected}
                         END`
                    : '';
                const rows = await this.#queryRows(
                    `SELECT COUNT(*)::integer AS count FROM "${spec.table}"
                     WHERE ${nullViolation}
                        OR ${legacyQuoted}::text IN ('NaN', 'Infinity', '-Infinity')
                        OR CASE
                             WHEN ${legacyQuoted} IS NULL OR ${legacyQuoted}::text IN ('NaN', 'Infinity', '-Infinity') THEN false
                             ELSE ${rangeViolation}
                           END
                        ${exactMismatch}`,
                    [],
                    connection
                );
                if (rows[0]?.count > 0) anomalies.push({ table: spec.table, column: legacy, count: rows[0].count });
            }
        }
        if (anomalies.length > 0) {
            throw new Error(`Exact-money preflight failed: ${JSON.stringify(anomalies)}`);
        }
        return { name: '005_exact_money_legacy_backfill.sql', anomalies: [] };
    }

    async #runPreflight(name, connection) {
        if (this.dialect === 'postgres' && name === '005_exact_money_legacy_backfill.sql') {
            return this.#exactMoneyPreflight(connection);
        }
        return null;
    }

    async #upPostgres({ dryRun }) {
        if (dryRun) {
            const statusList = await this.status();
            this.#assertImmutableHistory(statusList);
            const pending = statusList.filter(item => !item.applied);
            return {
                appliedCount: 0,
                results: pending.map(item => ({ name: item.name, status: 'DRY_RUN', checksum: item.currentChecksum }))
            };
        }
        const connection = await this.sequelize.connectionManager.getConnection({ type: 'WRITE' });
        const results = [];
        try {
            await connection.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID]);
            await this.ensureMigrationsTable(connection);
            const statusList = await this.status({ connection });
            this.#assertImmutableHistory(statusList);
            const pending = statusList.filter(item => !item.applied);
            for (const migration of pending) {
                await this.#runPreflight(migration.name, connection);
                const sqlContent = fs.readFileSync(path.join(MIGRATIONS_DIR, migration.name), 'utf8');
                const checksum = MigrationRunner.computeChecksum(sqlContent);
                console.log(`[MIGRATION] Applying ${migration.name}...`);
                await connection.query('BEGIN');
                try {
                    await connection.query(sqlContent);
                    await connection.query(
                        'INSERT INTO public.schema_migrations (name, applied_at, checksum) VALUES ($1, NOW(), $2)',
                        [migration.name, checksum]
                    );
                    await connection.query('COMMIT');
                    results.push({ name: migration.name, status: 'APPLIED', checksum });
                    console.log(`[MIGRATION] Successfully applied ${migration.name}`);
                } catch (error) {
                    await connection.query('ROLLBACK').catch(() => {});
                    throw new Error(`Migration ${migration.name} failed: ${error.message}`);
                }
            }
            return { appliedCount: results.length, results };
        } finally {
            await connection.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]).catch(() => {});
            await this.sequelize.connectionManager.releaseConnection(connection);
        }
    }

    async #upSqlite({ dryRun }) {
        const statusList = await this.status();
        this.#assertImmutableHistory(statusList);
        const pending = statusList.filter(item => !item.applied);
        if (dryRun) {
            return { appliedCount: 0, results: pending.map(item => ({ name: item.name, status: 'DRY_RUN' })) };
        }
        await this.ensureMigrationsTable();
        const results = [];
        for (const migration of pending) {
            const content = fs.readFileSync(path.join(MIGRATIONS_DIR, migration.name), 'utf8');
            const checksum = MigrationRunner.computeChecksum(content);
            await this.sequelize.transaction(async transaction => {
                await this.sequelize.query(content, { transaction });
                await this.sequelize.query(
                    'INSERT INTO schema_migrations (name, applied_at, checksum) VALUES (?, CURRENT_TIMESTAMP, ?)',
                    { replacements: [migration.name, checksum], transaction }
                );
            });
            results.push({ name: migration.name, status: 'APPLIED', checksum });
        }
        return { appliedCount: results.length, results };
    }

    async up({ dryRun = false } = {}) {
        return this.dialect === 'postgres' ? this.#upPostgres({ dryRun }) : this.#upSqlite({ dryRun });
    }

    async markBaseline(name, { confirmed = false } = {}) {
        if (this.dialect !== 'postgres') throw new Error('Baseline is only supported for PostgreSQL');
        if (!confirmed || name !== BASELINE_MIGRATION) {
            throw new Error(`Baseline requires ${BASELINE_MIGRATION} and explicit --confirm-baseline`);
        }
        const connection = await this.sequelize.connectionManager.getConnection({ type: 'WRITE' });
        try {
            await connection.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID]);
            for (const table of ['Users', 'accounts', 'ledger_transactions', 'transaction_lines']) {
                const rows = await this.#queryRows('SELECT to_regclass($1) AS reg', [`public."${table}"`], connection);
                if (!rows[0]?.reg) throw new Error(`Cannot baseline: required table ${table} is missing`);
            }
            await this.ensureMigrationsTable(connection);
            const statusList = await this.status({ connection });
            this.#assertImmutableHistory(statusList);
            const baseline = statusList.find(item => item.name === name);
            if (baseline?.applied) return { name, status: 'ALREADY_APPLIED' };
            await connection.query(
                'INSERT INTO public.schema_migrations (name, applied_at, checksum) VALUES ($1, NOW(), $2)',
                [name, baseline.currentChecksum]
            );
            return { name, status: 'BASELINED', checksum: baseline.currentChecksum };
        } finally {
            await connection.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]).catch(() => {});
            await this.sequelize.connectionManager.releaseConnection(connection);
        }
    }
}

export default MigrationRunner;
