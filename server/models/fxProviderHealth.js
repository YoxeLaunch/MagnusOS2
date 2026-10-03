/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // PROVIDER HEALTH & EVALUATION MODEL
 * Stores operational telemetry, latency, errors and trial evaluation metrics
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FxProviderHealth = sequelize.define('FxProviderHealth', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    provider: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    success: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    httpStatus: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'http_status'
    },
    latencyMs: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'latency_ms'
    },
    recordsReceived: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'records_received'
    },
    errorType: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'error_type'
    },
    retryCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'retry_count'
    },
    circuitState: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'CLOSED',
        field: 'circuit_state'
    }
}, {
    tableName: 'fx_provider_healths',
    timestamps: true,
    indexes: [
        { fields: ['provider'] },
        { fields: ['timestamp'] },
        { fields: ['provider', 'timestamp'] }
    ]
});
