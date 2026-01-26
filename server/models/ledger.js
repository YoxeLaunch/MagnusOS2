import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * LedgerTransaction Model (Header)
 * Represents a single financial event with one or more lines
 */
export const LedgerTransaction = sequelize.define('LedgerTransaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'user_id'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    payeeId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'payee_id'
    },
    // Payee name (denormalized for display)
    payeeName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'payee_name'
    },
    memo: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Transaction status for reconciliation
    status: {
        type: DataTypes.ENUM('pending', 'cleared', 'reconciled'),
        allowNull: false,
        defaultValue: 'pending'
    },
    // Transaction type hint (for filtering)
    type: {
        type: DataTypes.ENUM('income', 'expense', 'transfer', 'investment'),
        allowNull: false,
        defaultValue: 'expense'
    },
    // Check number or reference
    reference: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Is this a recurring transaction instance?
    recurringTemplateId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'recurring_template_id'
    }
}, {
    tableName: 'ledger_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'date'] },
        { fields: ['user_id', 'status'] },
        { fields: ['user_id', 'type'] },
        { fields: ['payee_id'] }
    ]
});

/**
 * TransactionLine Model (Splits)
 * Each transaction has 2+ lines that must sum to 0
 * Debit = positive, Credit = negative
 */
export const TransactionLine = sequelize.define('TransactionLine', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    transactionId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'transaction_id'
    },
    accountId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'account_id'
    },
    categoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'category_id'
    },
    // Amount in minor units (centavos)
    // Positive = debit (money into account), Negative = credit (money out of account)
    amountMinor: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'amount_minor'
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'DOP'
    },
    // For multi-currency transactions
    fxRate: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: true,
        field: 'fx_rate'
    },
    // Line-specific memo (for splits)
    memo: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'transaction_lines',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['transaction_id'] },
        { fields: ['account_id'] },
        { fields: ['category_id'] }
    ]
});

// ========================================
// Associations
// ========================================
LedgerTransaction.hasMany(TransactionLine, {
    foreignKey: 'transaction_id',
    as: 'lines',
    onDelete: 'CASCADE'
});

TransactionLine.belongsTo(LedgerTransaction, {
    foreignKey: 'transaction_id',
    as: 'transaction'
});

export default { LedgerTransaction, TransactionLine };
