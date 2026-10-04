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
 * Helper: Parse any decimal representation (string, number, bigint) directly to BigInt minor units (centavos)
 * without intermediate floating point conversion.
 */
export const toMinorUnitsBigInt = (amount) => {
    if (amount === null || amount === undefined || amount === '') return 0n;
    if (typeof amount === 'bigint') {
        if (amount < -9223372036854775808n || amount > 9223372036854775807n) {
            throw new RangeError('Monetary minor units exceed PostgreSQL BIGINT range');
        }
        return amount;
    }

    const str = String(amount).trim();
    if (!str) return 0n;
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(str)) {
        throw new TypeError(`Invalid decimal monetary amount: ${str}`);
    }

    const isNegative = str.startsWith('-');
    const cleanStr = str.replace(/^[+-]/, '');

    const parts = cleanStr.split('.');
    let intPart = parts[0] || '0';
    if (!intPart) intPart = '0';

    let fracPart = parts[1] || '';
    let fracInt = 0n;

    if (fracPart.length === 0) {
        fracInt = 0n;
    } else if (fracPart.length === 1) {
        fracInt = BigInt(fracPart) * 10n;
    } else if (fracPart.length === 2) {
        fracInt = BigInt(fracPart);
    } else {
        // Half-up rounding for sub-cent values (e.g. 3rd decimal >= 5)
        const firstTwo = BigInt(fracPart.slice(0, 2));
        const third = parseInt(fracPart[2], 10);
        fracInt = third >= 5 ? firstTwo + 1n : firstTwo;
    }

    const minor = BigInt(intPart) * 100n + fracInt;
    const signedMinor = isNegative ? -minor : minor;
    if (signedMinor < -9223372036854775808n || signedMinor > 9223372036854775807n) {
        throw new RangeError('Monetary amount exceeds PostgreSQL BIGINT range');
    }
    return signedMinor;
};

/**
 * Helper: Convert amount to minor units (centavos).
 * Returns integer string to prevent floating-point and concatenation bugs.
 */
export const toMinorUnits = (amount) => {
    return toMinorUnitsBigInt(amount).toString();
};

/**
 * Helper: Convert minor units to exact decimal string (no floating-point rounding errors)
 */
export const minorToDecimalString = (minor) => {
    if (minor === null || minor === undefined || minor === '') return '0.00';
    const str = String(minor).trim();
    const isNegative = str.startsWith('-');
    const clean = str.replace(/^[+-]/, '');
    const big = BigInt(clean.split('.')[0] || '0');
    const sign = isNegative ? '-' : '';
    const integerPart = big / 100n;
    const fractionalPart = (big % 100n).toString().padStart(2, '0');
    return `${sign}${integerPart}.${fractionalPart}`;
};

/**
 * Helper: Convert minor units to display amount.
 * Returns exact decimal string if exceeding safe floating point division (> 1e11 cents)
 * to prevent centesimal precision loss (e.g. 9007199254740991 / 100 -> .9 instead of .91).
 */
export const fromMinorUnits = (minor) => {
    if (minor === null || minor === undefined || minor === '') return 0;
    const cleanStr = String(minor).trim();
    const isNeg = cleanStr.startsWith('-');
    const digitsOnly = cleanStr.replace(/^[+-]/, '').split('.')[0];
    const big = BigInt(digitsOnly || '0');
    const signedBig = isNeg ? -big : big;

    // Keep two decimal places stable when rendered as Number; larger values stay strings.
    const SAFE_CENTS_LIMIT = 1_000_000_000_000n;
    if (signedBig >= -SAFE_CENTS_LIMIT && signedBig <= SAFE_CENTS_LIMIT) {
        return Number(signedBig) / 100;
    }
    return minorToDecimalString(signedBig);
};

/**
 * Convert exact minor units for algorithms that intrinsically require Number.
 * Refuses unsafe values instead of silently losing cents.
 */
export const minorUnitsToSafeNumber = (minor, label = 'monetary value') => {
    const value = BigInt(String(minor ?? 0));
    const limit = BigInt(Number.MAX_SAFE_INTEGER);
    if (value < -limit || value > limit) {
        throw new RangeError(`${label} exceeds JavaScript safe integer range`);
    }
    return Number(value) / 100;
};

export default Account;
