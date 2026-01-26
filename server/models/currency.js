import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const CurrencyHistory = sequelize.define('CurrencyHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    rate: { type: DataTypes.FLOAT, allowNull: false }
});
