import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { toMinorUnitsBigInt } from './account.js';
import { fromMinorUnits } from './account.js';

const includeField = (options, field) => {
    if (Array.isArray(options?.fields) && !options.fields.includes(field)) options.fields.push(field);
};

const syncSnapshotMoney = (instance, decimalField, minorField, options, { nullAsZero = false } = {}) => {
    const decimalValue = instance.getDataValue(decimalField);
    const decimalChanged = instance.isNewRecord ? decimalValue !== undefined : instance.changed(decimalField);
    const minorChanged = instance.isNewRecord
        ? instance.getDataValue(minorField) !== undefined && instance.getDataValue(minorField) !== null
        : instance.changed(minorField);
    const normalizedDecimal = decimalValue == null && nullAsZero ? '0' : decimalValue;

    if (decimalChanged && minorChanged) {
        const expected = toMinorUnitsBigInt(normalizedDecimal);
        const supplied = toMinorUnitsBigInt(BigInt(String(instance.getDataValue(minorField))));
        if (expected !== supplied) throw new Error(`${decimalField} and ${minorField} disagree`);
    } else if (decimalChanged || (instance.isNewRecord && nullAsZero)) {
        instance.setDataValue(minorField, toMinorUnitsBigInt(normalizedDecimal).toString());
        includeField(options, minorField);
    } else if (minorChanged) {
        const exact = toMinorUnitsBigInt(BigInt(String(instance.getDataValue(minorField))));
        instance.setDataValue(decimalField, fromMinorUnits(exact));
        includeField(options, decimalField);
    }
};

export const WealthSnapshot = sequelize.define('WealthSnapshot', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    netWorth: { type: DataTypes.FLOAT, allowNull: false },
    netWorthMinor: { type: DataTypes.BIGINT, allowNull: false, field: 'net_worth_minor' },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'DOP' },
    assets: { type: DataTypes.FLOAT, allowNull: true },
    assetsMinor: { type: DataTypes.BIGINT, allowNull: false, field: 'assets_minor' },
    liabilities: { type: DataTypes.FLOAT, allowNull: true },
    liabilitiesMinor: { type: DataTypes.BIGINT, allowNull: false, field: 'liabilities_minor' },
    breakdown: { type: DataTypes.JSON, allowNull: true } // Stores details: { cash, investments, material, debt }
}, {
    hooks: {
        beforeValidate: (instance, options) => {
            syncSnapshotMoney(instance, 'netWorth', 'netWorthMinor', options);
            syncSnapshotMoney(instance, 'assets', 'assetsMinor', options, { nullAsZero: true });
            syncSnapshotMoney(instance, 'liabilities', 'liabilitiesMinor', options, { nullAsZero: true });
        }
    }
});
