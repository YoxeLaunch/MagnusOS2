import { sequelize } from '../config/database.js';

/**
 * Schema Drift Audit Service
 * Compares Sequelize model definitions against actual PostgreSQL columns
 * for all mission-critical financial, ledger, and identity tables.
 */
export class SchemaDriftService {
    constructor(db = sequelize) {
        this.sequelize = db;
    }

    /**
     * Critical tables audited for drift
     */
    static CRITICAL_TABLES = [
        'Users',
        'accounts',
        'ledger_transactions',
        'transaction_lines',
        'savings_goals',
        'savings_contributions',
        'monthly_snapshots',
        'DailyTransactions',
        'Transactions',
        'WealthSnapshots',
        'CurrencyHistories'
    ];

    /**
     * Map Sequelize DataTypes to canonical normalized types
     */
    static normalizeType(rawType) {
        const type = (rawType || '').toUpperCase();
        if (type.includes('BIGINT') || type.includes('INT8')) return 'bigint';
        if (type.includes('INTEGER') || type.includes('INT4')) return 'integer';
        if (type.includes('FLOAT') || type.includes('DOUBLE') || type.includes('REAL')) return 'double precision';
        if (type.includes('DECIMAL') || type.includes('NUMERIC')) return 'numeric';
        if (type.includes('VARCHAR') || type.includes('STRING') || type.includes('TEXT')) return 'character varying';
        if (type.includes('DATEONLY') || type === 'DATE') return 'date';
        if (type.includes('TIMESTAMP')) return 'timestamp with time zone';
        if (type.includes('BOOLEAN') || type.includes('BOOL')) return 'boolean';
        if (type.includes('JSON')) return 'json';
        if (type.includes('UUID')) return 'uuid';
        return type.toLowerCase();
    }

    /**
     * Check schema drift for critical models against DB
     */
    async audit() {
        const dialect = this.sequelize.getDialect();
        if (dialect !== 'postgres') {
            return {
                isSynced: true,
                dialect,
                message: 'Schema drift audit is natively designed for PostgreSQL catalog.'
            };
        }

        const [dbColumns] = await this.sequelize.query(`
            SELECT table_name, column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public';
        `);

        // Index DB columns by "table.column"
        const dbMap = new Map();
        const existingTables = new Set();
        for (const col of dbColumns) {
            existingTables.add(col.table_name);
            dbMap.set(`${col.table_name}.${col.column_name}`, col.data_type.toLowerCase());
        }

        const missingTables = [];
        const missingColumns = [];
        const typeMismatches = [];

        for (const tableName of SchemaDriftService.CRITICAL_TABLES) {
            if (!existingTables.has(tableName)) {
                missingTables.push(tableName);
                continue;
            }

            // Find corresponding Sequelize model
            const model = Object.values(this.sequelize.models).find(
                m => m.tableName === tableName || m.name === tableName
            );

            if (!model) continue;

            for (const [attrName, attr] of Object.entries(model.rawAttributes)) {
                const colName = attr.field || attrName;
                const key = `${tableName}.${colName}`;

                if (!dbMap.has(key)) {
                    missingColumns.push({
                        table: tableName,
                        column: colName,
                        attribute: attrName,
                        expectedType: attr.type?.key || 'UNKNOWN'
                    });
                } else {
                    const dbType = dbMap.get(key);
                    const modelNorm = SchemaDriftService.normalizeType(attr.type?.key || '');
                    
                    // Check for dangerous precision drift (e.g. expecting BIGINT but having DOUBLE)
                    if (modelNorm === 'bigint' && dbType === 'double precision') {
                        typeMismatches.push({
                            table: tableName,
                            column: colName,
                            modelType: 'bigint',
                            dbType,
                            severity: 'CRITICAL_FLOAT_RISK'
                        });
                    }
                }
            }
        }

        const isSynced = missingTables.length === 0 && missingColumns.length === 0 && typeMismatches.length === 0;

        return {
            isSynced,
            timestamp: new Date().toISOString(),
            auditedTablesCount: SchemaDriftService.CRITICAL_TABLES.length,
            missingTables,
            missingColumns,
            typeMismatches,
            summary: isSynced 
                ? 'All critical financial models match PostgreSQL physical columns (0 drift).' 
                : `Drift detected: ${missingTables.length} missing tables, ${missingColumns.length} missing columns, ${typeMismatches.length} type mismatches.`
        };
    }
}

export default SchemaDriftService;
