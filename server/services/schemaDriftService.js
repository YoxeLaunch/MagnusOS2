import { sequelize } from '../config/database.js';

const CRITICAL_COLUMNS = [
    ['Users', 'username', 'character varying', false],
    ['accounts', 'opening_balance_minor', 'bigint', false],
    ['accounts', 'current_balance_minor', 'bigint', false],
    ['ledger_transactions', 'id', 'uuid', false],
    ['ledger_transactions', 'user_id', 'character varying', false],
    ['transaction_lines', 'transaction_id', 'uuid', false],
    ['transaction_lines', 'amount_minor', 'bigint', false],
    ['transaction_lines', 'fx_rate', 'numeric', true, 12, 6],
    ['savings_goals', 'target_amount_minor', 'bigint', false],
    ['savings_goals', 'current_amount_minor', 'bigint', false],
    ['savings_contributions', 'amount_minor', 'bigint', false],
    ['monthly_snapshots', 'user_id', 'character varying', false],
    ['DailyTransactions', 'amount_minor', 'bigint', false],
    ['Transactions', 'amount_minor', 'bigint', false],
    ['WealthSnapshots', 'net_worth_minor', 'bigint', false],
    ['WealthSnapshots', 'assets_minor', 'bigint', false],
    ['WealthSnapshots', 'liabilities_minor', 'bigint', false],
    ['CurrencyHistories', 'rate_exact', 'numeric', false, 12, 6]
].map(([table, column, type, nullable, precision = null, scale = null]) => ({
    table, column, type, nullable, precision, scale
}));

export class SchemaDriftService {
    constructor(db = sequelize) {
        this.sequelize = db;
    }

    static CRITICAL_TABLES = [...new Set(CRITICAL_COLUMNS.map(item => item.table))];

    static normalizeType(rawType) {
        const type = String(rawType || '').toUpperCase();
        if (type.includes('BIGINT') || type.includes('INT8')) return 'bigint';
        if (type.includes('INTEGER') || type.includes('INT4')) return 'integer';
        if (type.includes('FLOAT') || type.includes('DOUBLE') || type.includes('REAL')) return 'double precision';
        if (type.includes('DECIMAL') || type.includes('NUMERIC')) return 'numeric';
        if (type.includes('VARCHAR') || type.includes('STRING')) return 'character varying';
        if (type === 'TEXT') return 'text';
        if (type.includes('DATEONLY') || type === 'DATE') return 'date';
        if (type.includes('TIMESTAMP')) return 'timestamp with time zone';
        if (type.includes('BOOLEAN') || type.includes('BOOL')) return 'boolean';
        if (type.includes('JSONB')) return 'jsonb';
        if (type.includes('JSON')) return 'json';
        if (type.includes('UUID')) return 'uuid';
        return type.toLowerCase();
    }

    async audit() {
        const dialect = this.sequelize.getDialect();
        if (dialect !== 'postgres') {
            return { isSynced: true, dialect, message: 'Schema drift audit requires PostgreSQL catalogs.' };
        }

        const [dbColumns] = await this.sequelize.query(`
            SELECT table_name, column_name, data_type, is_nullable,
                   numeric_precision, numeric_scale, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
        `);
        const dbMap = new Map(dbColumns.map(column => [`${column.table_name}.${column.column_name}`, column]));
        const modelsByTable = new Map(Object.values(this.sequelize.models).map(model => [model.tableName, model]));
        const missingTables = [];
        const missingModels = [];
        const missingColumns = [];
        const typeMismatches = [];
        const definitionMismatches = [];

        for (const table of SchemaDriftService.CRITICAL_TABLES) {
            if (!dbColumns.some(column => column.table_name === table)) missingTables.push(table);
            if (!modelsByTable.has(table)) missingModels.push(table);
        }

        for (const expected of CRITICAL_COLUMNS) {
            const key = `${expected.table}.${expected.column}`;
            const dbColumn = dbMap.get(key);
            if (!dbColumn) {
                missingColumns.push(expected);
                continue;
            }
            if (dbColumn.data_type.toLowerCase() !== expected.type) {
                typeMismatches.push({
                    table: expected.table,
                    column: expected.column,
                    expectedType: expected.type,
                    dbType: dbColumn.data_type.toLowerCase()
                });
            }
            const dbNullable = dbColumn.is_nullable === 'YES';
            if (dbNullable !== expected.nullable) {
                definitionMismatches.push({
                    table: expected.table,
                    column: expected.column,
                    property: 'nullable',
                    expected: expected.nullable,
                    actual: dbNullable
                });
            }
            if (expected.type === 'numeric'
                && (Number(dbColumn.numeric_precision) !== expected.precision || Number(dbColumn.numeric_scale) !== expected.scale)) {
                definitionMismatches.push({
                    table: expected.table,
                    column: expected.column,
                    property: 'precision/scale',
                    expected: `${expected.precision},${expected.scale}`,
                    actual: `${dbColumn.numeric_precision},${dbColumn.numeric_scale}`
                });
            }

            const model = modelsByTable.get(expected.table);
            if (!model) continue;
            const attribute = Object.values(model.rawAttributes).find(attr => (attr.field || attr.fieldName) === expected.column);
            if (!attribute) {
                definitionMismatches.push({ table: expected.table, column: expected.column, property: 'modelAttribute', expected: 'present', actual: 'missing' });
                continue;
            }
            const modelType = SchemaDriftService.normalizeType(attribute.type?.key || attribute.type?.toString());
            if (modelType !== expected.type) {
                definitionMismatches.push({ table: expected.table, column: expected.column, property: 'modelType', expected: expected.type, actual: modelType });
            }
            const modelNullable = attribute.allowNull !== false && !attribute.primaryKey;
            if (modelNullable !== expected.nullable) {
                definitionMismatches.push({ table: expected.table, column: expected.column, property: 'modelNullable', expected: expected.nullable, actual: modelNullable });
            }
        }

        const isSynced = [missingTables, missingModels, missingColumns, typeMismatches, definitionMismatches]
            .every(items => items.length === 0);
        return {
            isSynced,
            timestamp: new Date().toISOString(),
            auditedTablesCount: SchemaDriftService.CRITICAL_TABLES.length,
            auditedColumnsCount: CRITICAL_COLUMNS.length,
            missingTables,
            missingModels,
            missingColumns,
            typeMismatches,
            definitionMismatches,
            summary: isSynced
                ? `Critical manifest matches PostgreSQL and Sequelize (${CRITICAL_COLUMNS.length} columns).`
                : `Drift detected across ${missingTables.length + missingModels.length + missingColumns.length + typeMismatches.length + definitionMismatches.length} checks.`
        };
    }
}

export default SchemaDriftService;
