import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { toMinorUnitsBigInt, fromMinorUnits } from './account.js';

export const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.STRING, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    amountMinor: { type: DataTypes.BIGINT, allowNull: true, field: 'amount_minor' },
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
        beforeSave: (instance) => {
            if (instance.amount !== undefined && instance.amount !== null && !instance.amountMinor) {
                instance.amountMinor = toMinorUnitsBigInt(instance.amount).toString();
            } else if (instance.amountMinor !== undefined && instance.amountMinor !== null && instance.amount === undefined) {
                instance.amount = fromMinorUnits(instance.amountMinor);
            }
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
    amountMinor: { type: DataTypes.BIGINT, allowNull: true, field: 'amount_minor' },
    description: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true }
}, {
    hooks: {
        beforeSave: (instance) => {
            if (instance.amount !== undefined && instance.amount !== null && !instance.amountMinor) {
                instance.amountMinor = toMinorUnitsBigInt(instance.amount).toString();
            } else if (instance.amountMinor !== undefined && instance.amountMinor !== null && instance.amount === undefined) {
                instance.amount = fromMinorUnits(instance.amountMinor);
            }
        }
    },
    indexes: [
        { fields: ['userId'] },
        { fields: ['date'] }
    ]
});
