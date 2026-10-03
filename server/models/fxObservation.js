/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // FX OBSERVATION MODEL
 * PostgreSQL/SQLite persistence for discrete historical exchange rate records
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FxRateObservation = sequelize.define('FxRateObservation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    observedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'observed_at'
    },
    provider: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    institutionId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'institution_id'
    },
    institutionName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'institution_name'
    },
    rateType: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'RETAIL_BANK',
        field: 'rate_type'
    },
    baseCurrency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'USD',
        field: 'base_currency'
    },
    quoteCurrency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'DOP',
        field: 'quote_currency'
    },
    buy: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    sell: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    mid: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    spread: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    confidence: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1.0
    },
    validationStatus: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'VERIFIED',
        field: 'validation_status'
    },
    providerUpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'provider_updated_at'
    }
}, {
    tableName: 'fx_rate_observations',
    timestamps: true,
    indexes: [
        { fields: ['institution_id'] },
        { fields: ['observed_at'] },
        { fields: ['provider'] },
        { fields: ['institution_id', 'observed_at'] }
    ]
});
