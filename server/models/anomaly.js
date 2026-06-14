import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * FinancialAnomaly Model
 * Stores statistically significant deviations in daily spending by category.
 * Detected via residual analysis (actual - predicted > 2σ).
 */
export const FinancialAnomaly = sequelize.define('FinancialAnomaly', {
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
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amountActual: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'amount_actual'
    },
    amountExpected: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'amount_expected'
    },
    residual: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    zScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'z_score'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'justified'),
        allowNull: false,
        defaultValue: 'pending'
    },
    justification: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'financial_anomalies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'status'] },
        { fields: ['user_id', 'date'] }
    ]
});
