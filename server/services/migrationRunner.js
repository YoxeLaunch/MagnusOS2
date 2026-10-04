import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { sequelize } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const ADVISORY_LOCK_ID = 987654321;

/**
 * Migration Runner for MagnusOS2 Schema Governance
 * Manages versioned schema migrations with strict tracking in `schema_migrations`.
 */
export class MigrationRunner {
    constructor(db = sequelize) {
        this.sequelize = db;
        this.dialect = db.getDialect();
    }

    /**
     * Compute SHA-256 checksum of migration content
     */
    static computeChecksum(content) {
        return crypto.createHash('sha256').update(content.trim()).digest('hex');
    }

    /**
     * Ensure the schema_migrations tracking table exists
     */
    async ensureMigrationsTable() {
        if (this.dialect === 'postgres') {
            await this.sequelize.query(`
                CREATE TABLE IF NOT EXISTS public.schema_migrations (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    checksum VARCHAR(64)
                );
            `);
        } else {
            await this.sequelize.query(`
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    checksum TEXT
                );
            `);
        }
    }

    /**
     * Get all migration files from server/migrations sorted
     */
    getMigrationFiles() {
        if (!fs.existsSync(MIGRATIONS_DIR)) {
            return [];
        }

        return fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort((a, b) => a.localeCompare(b));
    }

    /**
     * Fetch list of applied migrations from database
     */
    async getAppliedMigrations() {
        await this.ensureMigrationsTable();
        const tableName = this.dialect === 'postgres' ? 'public.schema_migrations' : 'schema_migrations';
        const [rows] = await this.sequelize.query(`
            SELECT name, applied_at, checksum 
            FROM ${tableName} 
            ORDER BY id ASC;
        `);
        return rows;
    }

    /**
     * Get status of all migrations (applied, pending, checksum verification)
     */
    async status() {
        const files = this.getMigrationFiles();
        const appliedRows = await this.getAppliedMigrations();
        const appliedMap = new Map();

        for (const row of appliedRows) {
            appliedMap.set(row.name, {
                appliedAt: row.applied_at,
                checksum: row.checksum
            });
        }

        return files.map(file => {
            const isApplied = appliedMap.has(file);
            const appliedData = appliedMap.get(file);
            const filePath = path.join(MIGRATIONS_DIR, file);
            let currentChecksum = null;
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                currentChecksum = MigrationRunner.computeChecksum(content);
            } catch (_) {}

            return {
                name: file,
                applied: isApplied,
                appliedAt: appliedData ? appliedData.appliedAt : null,
                recordedChecksum: appliedData ? appliedData.checksum : null,
                currentChecksum,
                checksumMatches: appliedData && appliedData.checksum ? appliedData.checksum === currentChecksum : null
            };
        });
    }

    /**
     * Apply all pending migrations in order with advisory lock
     */
    async up({ dryRun = false } = {}) {
        await this.ensureMigrationsTable();

        const isPostgres = this.dialect === 'postgres';
        if (isPostgres) {
            await this.sequelize.query(`SELECT pg_advisory_lock(${ADVISORY_LOCK_ID});`);
        }

        const results = [];

        try {
            const statusList = await this.status();
            const pending = statusList.filter(m => !m.applied);

            if (pending.length === 0) {
                return { appliedCount: 0, results: [] };
            }

            for (const migration of pending) {
                const filePath = path.join(MIGRATIONS_DIR, migration.name);
                const sqlContent = fs.readFileSync(filePath, 'utf8');
                const checksum = MigrationRunner.computeChecksum(sqlContent);

                if (dryRun) {
                    results.push({ name: migration.name, status: 'DRY_RUN', checksum });
                    continue;
                }

                console.log(`[MIGRATION] Applying ${migration.name}...`);

                // Execute SQL script inside transaction
                const t = await this.sequelize.transaction();
                try {
                    await this.sequelize.query(sqlContent, { transaction: t });

                    // Record in schema_migrations
                    if (isPostgres) {
                        await this.sequelize.query(
                            `INSERT INTO public.schema_migrations (name, applied_at, checksum) VALUES ($1, NOW(), $2);`,
                            { bind: [migration.name, checksum], transaction: t }
                        );
                    } else {
                        await this.sequelize.query(
                            `INSERT INTO schema_migrations (name, applied_at, checksum) VALUES (?, CURRENT_TIMESTAMP, ?);`,
                            { replacements: [migration.name, checksum], transaction: t }
                        );
                    }

                    await t.commit();
                    console.log(`[MIGRATION] Successfully applied ${migration.name}`);
                    results.push({ name: migration.name, status: 'APPLIED', checksum });
                } catch (err) {
                    await t.rollback().catch(() => {});
                    console.error(`[MIGRATION] Failed to apply ${migration.name}:`, err.message);
                    throw new Error(`Migration ${migration.name} failed: ${err.message}`);
                }
            }

            return { appliedCount: results.length, results };
        } finally {
            if (isPostgres) {
                await this.sequelize.query(`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID});`).catch(() => {});
            }
        }
    }
}

export default MigrationRunner;
