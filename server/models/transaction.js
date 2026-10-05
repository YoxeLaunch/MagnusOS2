import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { toMinorUnitsBigInt, fromMinorUnits } from './account.js';

const includeField = (options, field) => {
    if (Array.isArray(options?.fields) && !options.fields.includes(field)) options.fields.push(field);
};

const syncMoneyPair = (instance, decimalField, minorField, options) => {
    const decimalChanged = instance.isNewRecord
        ? instance.getDataValue(decimalField) !== undefined
        : instance.changed(decimalField);
    const minorChanged = instance.isNewRecord
        ? instance.getDataValue(minorField) !== undefined && instance.getDataValue(minorField) !== null
        : instance.changed(minorField);

    if (decimalChanged && minorChanged) {
        const expected = toMinorUnitsBigInt(instance.getDataValue(decimalField));
        const supplied = toMinorUnitsBigInt(BigInt(String(instance.getDataValue(minorField))));
        if (expected !== supplied) throw new Error(`${decimalField} and ${minorField} disagree`);
    } else if (decimalChanged) {
        instance.setDataValue(minorField, toMinorUnitsBigInt(instance.getDataValue(decimalField)).toString());
        includeField(options, minorField);
    } else if (minorChanged) {
        const exact = toMinorUnitsBigInt(BigInt(String(instance.getDataValue(minorField))));
        instance.setDataValue(decimalField, fromMinorUnits(exact));
        includeField(options, decimalField);
    }
};

export const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.STRING, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    amountMinor: { type: DataTypes.BIGINT, allowNull: false, field: 'amount_minor' },
    frequency: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'DOP' },
    date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    type: { type: DataTypes.STRING, allowNull: false },
    deductions: { type: DataTypes.JSON, allowNull: true }, // For salary deductions (AFP, SFS, ISR, Others)
    validFrom: { type: DataTypes.DATEONLY, allowNull: true }, // Added for FASE 1 - Non-destructive Historical Tracking
    validTo: { type: DataTypes.DATEONLY, allowNull: true }, // Added for FASE 1 - Non-destructive Historical Tracking
    conceptId: { type: DataTypes.STRING, allowNull: true } // Links versions of the same recurring concept (e.g. salary raises) together
}, {
    hooks: {
        beforeValidate: (instance, options) => {
            syncMoneyPair(instance, 'amount', 'amountMinor', options);
        }
    },
    indexes: [
        { fields: ['userId'] },
        { fields: ['date'] }
    ]
});

export const DailyTransaction = sequelize.define('DailyTransaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    amountMinor: { type: DataTypes.BIGINT, allowNull: false, field: 'amount_minor' },
    description: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true }
}, {
    hooks: {
        beforeValidate: (instance, options) => {
            syncMoneyPair(instance, 'amount', 'amountMinor', options);
        }
    },
    indexes: [
        { fields: ['userId'] },
        { fields: ['date'] }
    ]
});
