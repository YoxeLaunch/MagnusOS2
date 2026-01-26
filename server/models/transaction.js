import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.STRING, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    frequency: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'DOP' },
    date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    type: { type: DataTypes.STRING, allowNull: false },
    deductions: { type: DataTypes.JSON, allowNull: true } // For salary deductions (AFP, SFS, ISR, Others)
});

export const DailyTransaction = sequelize.define('DailyTransaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true }
});
