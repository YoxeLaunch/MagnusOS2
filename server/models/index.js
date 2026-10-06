import { sequelize, getDatabaseInfo } from '../config/database.js';
import { Transaction, DailyTransaction } from './transaction.js';
import { CurrencyHistory } from './currency.js';
import { User } from './user.js';
import { WealthSnapshot } from './wealthSnapshot.js';

// New Ledger Models (P1)
import { Account, toMinorUnits, toMinorUnitsBigInt, fromMinorUnits, minorToDecimalString, minorUnitsToSafeNumber } from './account.js';
import { Category, Payee } from './category.js';
import { LedgerTransaction, TransactionLine } from './ledger.js';
import { SavingsGoal, SavingsContribution } from './savingsGoal.js';
import { MonthlySnapshot } from './monthlySnapshot.js';
import { FinancialAnomaly } from './anomaly.js';
import { FxRateObservation } from './fxObservation.js';
import { FxProviderHealth } from './fxProviderHealth.js';
import { MacroIndicator, MacroObservation, MacroSourceHealth } from './macroIndicator.js';
import { MagnusEvent, MagnusNotification } from './magnusEvent.js';
import { FuelCatalog, FuelPriceObservation, FuelPolicyWeek, FuelSourceHealth } from './fuelPrice.js';
import { SbBankingMetric, SbSyncRun } from './sbBankingMetric.js';

// ========================================
// Legacy Associations (to be deprecated)
// ========================================
User.hasMany(Transaction, { foreignKey: 'userId', sourceKey: 'username' });
Transaction.belongsTo(User, { foreignKey: 'userId', targetKey: 'username' });

User.hasMany(DailyTransaction, { foreignKey: 'userId', sourceKey: 'username' });
DailyTransaction.belongsTo(User, { foreignKey: 'userId', targetKey: 'username' });

User.hasMany(WealthSnapshot, { foreignKey: 'userId', sourceKey: 'username' });
WealthSnapshot.belongsTo(User, { foreignKey: 'userId', targetKey: 'username' });

// ========================================
// New Ledger Associations
// ========================================
// Account -> TransactionLines
Account.hasMany(TransactionLine, { foreignKey: 'account_id', as: 'transactions' });
TransactionLine.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });

// Category -> TransactionLines
Category.hasMany(TransactionLine, { foreignKey: 'category_id', as: 'transactions' });
TransactionLine.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Payee -> LedgerTransactions
Payee.hasMany(LedgerTransaction, { foreignKey: 'payee_id', as: 'transactions' });
LedgerTransaction.belongsTo(Payee, { foreignKey: 'payee_id', as: 'payee' });

// SavingsGoal -> Account (optional link)
Account.hasMany(SavingsGoal, { foreignKey: 'linked_account_id', as: 'savingsGoals' });
SavingsGoal.belongsTo(Account, { foreignKey: 'linked_account_id', as: 'linkedAccount' });

// FinancialAnomaly -> User
User.hasMany(FinancialAnomaly, { foreignKey: 'user_id', sourceKey: 'username', as: 'anomalies' });
FinancialAnomaly.belongsTo(User, { foreignKey: 'user_id', targetKey: 'username', as: 'user' });

import { MigrationRunner } from '../services/migrationRunner.js';

// ========================================
// Database Initialization
// ========================================
export const initDb = async () => {
    const dbInfo = getDatabaseInfo();

    try {
        if (dbInfo.type === 'sqlite') {
            // SQLite specific: Disable FK checks for sync and use safer sync mode
            await sequelize.query('PRAGMA foreign_keys = OFF;');
            await sequelize.query('DROP TABLE IF EXISTS `Users_backup`;');

            // For SQLite, only create missing tables, don't alter existing ones
            // This avoids issues with SQLite's limited ALTER TABLE support
            await sequelize.sync({ alter: false });

            await sequelize.query('PRAGMA foreign_keys = ON;');
        } else {
            // PostgreSQL Schema Governance:
            // En producción: NUNCA ejecutar sequelize.sync(). Gobernanza estricta por migraciones.
            if (process.env.NODE_ENV === 'production') {
                console.log('[DB] Production environment detected: verifying migration state (read-only).');
                const runner = new MigrationRunner(sequelize);
                await runner.assertUpToDate();
            } else {
                // En desarrollo / test: aplica migraciones versionadas de forma determinista
                const runner = new MigrationRunner(sequelize);
                await runner.up();
            }
        }

        console.log(`[DB] Database initialized and migrations verified (${dbInfo.type.toUpperCase()})`);

        // Seed default categories if none exist
        await seedDefaultCategories();

    } catch (error) {
        console.error('[DB] Error initializing database:', error);
        // Don't throw in development, allow the app to continue
        if (process.env.NODE_ENV === 'production') {
            throw error;
        }
    }
};

// ========================================
// Seed Default Categories
// ========================================
const seedDefaultCategories = async () => {
    const count = await Category.count();
    if (count > 0) return;

    console.log('[DB] Seeding default categories...');

    const defaultCategories = [
        // Income
        { userId: 'system', name: 'Salario', group: 'Trabajo', type: 'income', icon: 'Briefcase', color: '#22c55e' },
        { userId: 'system', name: 'Freelance', group: 'Trabajo', type: 'income', icon: 'Laptop', color: '#10b981' },
        { userId: 'system', name: 'Inversiones', group: 'Pasivo', type: 'income', icon: 'TrendingUp', color: '#059669' },
        { userId: 'system', name: 'Otros Ingresos', group: 'Otros', type: 'income', icon: 'Plus', color: '#14b8a6' },

        // Expenses
        { userId: 'system', name: 'Alimentación', group: 'Necesidades', type: 'expense', icon: 'UtensilsCrossed', color: '#f97316' },
        { userId: 'system', name: 'Transporte', group: 'Necesidades', type: 'expense', icon: 'Car', color: '#ef4444' },
        { userId: 'system', name: 'Vivienda', group: 'Necesidades', type: 'expense', icon: 'Home', color: '#dc2626' },
        { userId: 'system', name: 'Servicios', group: 'Necesidades', type: 'expense', icon: 'Zap', color: '#f59e0b' },
        { userId: 'system', name: 'Salud', group: 'Necesidades', type: 'expense', icon: 'Heart', color: '#ec4899' },
        { userId: 'system', name: 'Educación', group: 'Desarrollo', type: 'expense', icon: 'GraduationCap', color: '#8b5cf6' },
        { userId: 'system', name: 'Entretenimiento', group: 'Deseos', type: 'expense', icon: 'Gamepad2', color: '#6366f1' },
        { userId: 'system', name: 'Ropa', group: 'Deseos', type: 'expense', icon: 'Shirt', color: '#a855f7' },
        { userId: 'system', name: 'Otros Gastos', group: 'Otros', type: 'expense', icon: 'MoreHorizontal', color: '#6b7280' }
    ];

    await Category.bulkCreate(defaultCategories);
    console.log('[DB] Default categories seeded.');
};

// ========================================
// Exports
// ========================================
export {
    // Legacy (to be deprecated)
    Transaction,
    DailyTransaction,
    CurrencyHistory,
    User,
    WealthSnapshot,

    // New Ledger Models
    Account,
    Category,
    Payee,
    LedgerTransaction,
    TransactionLine,
    SavingsGoal,
    SavingsContribution,

    // AI Analytics Models (v2.0)
    MonthlySnapshot,

    // Econometrics Models (v2.1)
    FinancialAnomaly,

    // FX Market Service Models (Providence FX)
    FxRateObservation,
    FxProviderHealth,

    // Macro RD Models
    MacroIndicator,
    MacroObservation,
    MacroSourceHealth,

    // Magnus Event & Notification Engine Models
    MagnusEvent,
    MagnusNotification,

    // Energía RD Models
    FuelCatalog,
    FuelPriceObservation,
    FuelPolicyWeek,
    FuelSourceHealth,

    // Superintendencia de Bancos (SB) Models
    SbBankingMetric,
    SbSyncRun,

    // Helpers
    toMinorUnits,
    toMinorUnitsBigInt,
    fromMinorUnits,
    minorToDecimalString,
    minorUnitsToSafeNumber,

    // Schema Governance & Migrations
    MigrationRunner,

    // Sequelize instance
    sequelize
};

export { SchemaDriftService } from '../services/schemaDriftService.js';
