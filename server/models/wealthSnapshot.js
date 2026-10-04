import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { toMinorUnitsBigInt } from './account.js';

export const WealthSnapshot = sequelize.define('WealthSnapshot', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    netWorth: { type: DataTypes.FLOAT, allowNull: false },
    netWorthMinor: { type: DataTypes.BIGINT, allowNull: true, field: 'net_worth_minor' },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'DOP' },
    assets: { type: DataTypes.FLOAT, allowNull: true },
    assetsMinor: { type: DataTypes.BIGINT, allowNull: true, field: 'assets_minor' },
    liabilities: { type: DataTypes.FLOAT, allowNull: true },
    liabilitiesMinor: { type: DataTypes.BIGINT, allowNull: true, field: 'liabilities_minor' },
    breakdown: { type: DataTypes.JSON, allowNull: true } // Stores details: { cash, investments, material, debt }
}, {
    hooks: {
        beforeSave: (instance) => {
            if (instance.netWorth !== undefined && instance.netWorth !== null && !instance.netWorthMinor) {
                instance.netWorthMinor = toMinorUnitsBigInt(instance.netWorth).toString();
            }
            if (instance.assets !== undefined && instance.assets !== null && !instance.assetsMinor) {
                instance.assetsMinor = toMinorUnitsBigInt(instance.assets).toString();
            }
            if (instance.liabilities !== undefined && instance.liabilities !== null && !instance.liabilitiesMinor) {
                instance.liabilitiesMinor = toMinorUnitsBigInt(instance.liabilities).toString();
            }
        }
    }
});
