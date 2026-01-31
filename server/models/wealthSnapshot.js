import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WealthSnapshot = sequelize.define('WealthSnapshot', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    netWorth: { type: DataTypes.FLOAT, allowNull: false },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'DOP' },
    assets: { type: DataTypes.FLOAT, allowNull: true },
    liabilities: { type: DataTypes.FLOAT, allowNull: true },
    breakdown: { type: DataTypes.JSON, allowNull: true } // Stores details: { cash, investments, material, debt }
});
