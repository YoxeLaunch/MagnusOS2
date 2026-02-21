/**
 * Script: add-indexes.js
 * Propósito: Agregar índices críticos a las tablas de transacciones en PostgreSQL.
 * 
 * Uso: node server/scripts/add-indexes.js
 * (Puede ejecutarse en cualquier momento — usa IF NOT EXISTS, es idempotente)
 */

import { sequelize } from '../config/database.js';

const indexes = [
    // Transacciones por usuario y fecha (consulta más frecuente)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_userid_date
     ON "Transactions" ("userId", "date" DESC)`,

    // Transacciones diarias por usuario y fecha
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_transactions_userid_date
     ON "DailyTransactions" ("userId", "date" DESC)`,

    // LedgerTransactions por fecha
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_txn_date
     ON "LedgerTransactions" ("date" DESC)`,

    // TransactionLines por cuenta (para balance de cuentas)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_txn_lines_account
     ON "TransactionLines" ("account_id")`,

    // TransactionLines por categoría (para reportes)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_txn_lines_category
     ON "TransactionLines" ("category_id")`,

    // WealthSnapshots por usuario y fecha
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wealth_snapshots_userid_date
     ON "WealthSnapshots" ("userId", "date" DESC)`,
];

const run = async () => {
    console.log('[INDEXES] Connecting to PostgreSQL...');
    try {
        await sequelize.authenticate();
        console.log('[INDEXES] Connection OK. Creating indexes...\n');

        for (const sql of indexes) {
            const name = sql.match(/idx_\w+/)?.[0] ?? 'unknown';
            try {
                await sequelize.query(sql);
                console.log(`  ✅ ${name}`);
            } catch (err) {
                // Algunos índices pueden fallar si la tabla no existe aún — no es crítico
                console.warn(`  ⚠️  ${name}: ${err.message}`);
            }
        }

        console.log('\n[INDEXES] Done.');
        process.exit(0);
    } catch (err) {
        console.error('[INDEXES] FATAL:', err.message);
        process.exit(1);
    }
};

run();
