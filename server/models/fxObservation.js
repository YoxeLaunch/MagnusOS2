/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // FX OBSERVATION MODEL
 * PostgreSQL/SQLite persistence for discrete historical exchange rate records
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

import crypto from 'crypto';

function populateForensicFields(instance) {
    if (!instance) return;
    if (!instance.economicDate && instance.observedAt) {
        const d = instance.observedAt instanceof Date ? instance.observedAt : new Date(instance.observedAt);
        if (!isNaN(d.getTime())) {
            instance.economicDate = d.toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' });
        }
    }
    if (instance.buyExact == null && instance.buy != null) {
        instance.buyExact = Number(instance.buy).toFixed(6);
    }
    if (instance.sellExact == null && instance.sell != null) {
        instance.sellExact = Number(instance.sell).toFixed(6);
    }
    if (instance.midExact == null && instance.mid != null) {
        instance.midExact = Number(instance.mid).toFixed(6);
    }
    if (instance.spreadExact == null && instance.spread != null) {
        instance.spreadExact = Number(instance.spread).toFixed(6);
    }
    if (!instance.provenanceHash) {
        const rawKey = [
            instance.provider || 'unknown',
            instance.institutionId || 'unknown',
            instance.baseCurrency || 'USD',
            instance.quoteCurrency || 'DOP',
            instance.rateType || 'RETAIL_BANK',
            instance.economicDate || (instance.observedAt ? new Date(instance.observedAt).toISOString() : ''),
            instance.buyExact || instance.buy || '',
            instance.sellExact || instance.sell || ''
        ].join('|');
        instance.provenanceHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    }
}

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
    },
    buyExact: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: true,
        field: 'buy_exact'
    },
    sellExact: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: true,
        field: 'sell_exact'
    },
    midExact: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: true,
        field: 'mid_exact'
    },
    spreadExact: {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: true,
        field: 'spread_exact'
    },
    economicDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'economic_date'
    },
    provenanceHash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: 'provenance_hash'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    tableName: 'fx_rate_observations',
    timestamps: true,
    indexes: [
        { fields: ['institution_id'] },
        { fields: ['observed_at'] },
        { fields: ['provider'] },
        { fields: ['institution_id', 'observed_at'] },
        { fields: ['economic_date'] },
        { fields: ['base_currency', 'economic_date'] }
    ],
    hooks: {
        beforeValidate: (instance) => populateForensicFields(instance),
        beforeCreate: (instance) => populateForensicFields(instance),
        beforeUpdate: (instance) => populateForensicFields(instance),
        beforeBulkCreate: (instances) => {
            if (Array.isArray(instances)) {
                instances.forEach(populateForensicFields);
            }
        }
    }
});
