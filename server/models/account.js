import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Account Model
 * Represents a financial account where money lives
 * Types: cash, checking, savings, credit_card, investment, loan
 */
export const Account = sequelize.define('Account', {
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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('cash', 'checking', 'savings', 'credit_card', 'investment', 'loan'),
        allowNull: false,
        defaultValue: 'checking'
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'DOP'
    },
    institution: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Balance in minor units (centavos) for precision
    openingBalanceMinor: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: 'opening_balance_minor'
    },
    // Calculated field (cached for performance)
    currentBalanceMinor: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        field: 'current_balance_minor'
    },
    isArchived: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_archived'
    },
    // Display order
    sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order'
    },
    // Notes/description
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'accounts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'type'] },
        { fields: ['user_id', 'is_archived'] }
    ]
});

/**
 * Helper: Convert amount to minor units (centavos)
 */
export const toMinorUnits = (amount) => {
    if (typeof amount === 'bigint') return amount;
    return Math.round(Number(amount) * 100);
};

/**
 * Helper: Convert minor units to exact decimal string (no floating-point rounding errors)
 */
export const minorToDecimalString = (minor) => {
    if (minor === null || minor === undefined) return '0.00';
    const big = typeof minor === 'bigint' ? minor : BigInt(String(minor).split('.')[0]);
    const sign = big < 0n ? '-' : '';
    const abs = big < 0n ? -big : big;
    const integerPart = abs / 100n;
    const fractionalPart = (abs % 100n).toString().padStart(2, '0');
    return `${sign}${integerPart}.${fractionalPart}`;
};

/**
 * Helper: Convert minor units to display amount
 * Returns exact decimal string if exceeding Number.MAX_SAFE_INTEGER to prevent precision loss.
 */
export const fromMinorUnits = (minor) => {
    if (minor === null || minor === undefined) return 0;
    const big = typeof minor === 'bigint' ? minor : BigInt(String(minor).split('.')[0]);
    if (big >= BigInt(Number.MIN_SAFE_INTEGER) && big <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return Number(big) / 100;
    }
    return minorToDecimalString(big);
};

export default Account;
