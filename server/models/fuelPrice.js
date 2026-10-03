/**
 * ============================================================================
 * ENERGÍA RD // DATABASE MODELS (SEQUELIZE)
 * Catálogo de combustibles, precios semanales, subsidios de política y telemetría
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Catálogo canónico de combustibles
 */
export const FuelCatalog = sequelize.define('FuelCatalog', {
    id: {
        type: DataTypes.STRING(50),
        primaryKey: true // ej: 'gasoline_premium', 'gasoline_regular', 'diesel_regular', 'diesel_optimo', 'glp', 'natural_gas'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    shortName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'short_name'
    },
    category: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'PRIMARY', // 'PRIMARY' | 'SECONDARY'
        field: 'category'
    },
    unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'RD$/gal',
        field: 'unit'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    priorityOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
        field: 'priority_order'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'fuel_catalogs',
    timestamps: true,
    underscored: true
});

/**
 * Observaciones oficiales semanales de precios y estructura de costos
 */
export const FuelPriceObservation = sequelize.define('FuelPriceObservation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    fuelId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'fuel_id'
    },
    priceDop: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'price_dop'
    },
    unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'RD$/gal',
        field: 'unit'
    },
    previousPriceDop: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'previous_price_dop'
    },
    changeDop: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'change_dop'
    },
    changePercent: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'change_percent'
    },
    validFrom: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'valid_from'
    },
    validTo: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'valid_to'
    },
    publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'published_at'
    },
    observedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'observed_at'
    },
    source: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'MICM'
    },
    sourceUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'source_url'
    },
    subsidyPerUnit: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'subsidy_per_unit'
    },
    importParityPrice: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'import_parity_price'
    },
    taxLey11200: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'tax_ley_112_00'
    },
    taxLey49506: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'tax_ley_495_06'
    },
    distributionMargin: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'distribution_margin'
    },
    retailMargin: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'retail_margin'
    },
    transportFee: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'transport_fee'
    },
    exchangeRateReference: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'exchange_rate_reference'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'fuel_price_observations',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['fuel_id', 'valid_from']
        }
    ]
});

/**
 * Resumen de política gubernamental y subsidios globales por semana
 */
export const FuelPolicyWeek = sequelize.define('FuelPolicyWeek', {
    id: {
        type: DataTypes.STRING(60),
        primaryKey: true // ej: 'WEEK-2026-10-03-2026-10-09'
    },
    validFrom: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        unique: true,
        field: 'valid_from'
    },
    validTo: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'valid_to'
    },
    publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'published_at'
    },
    totalSubsidyDop: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'total_subsidy_dop'
    },
    wtiReference: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'wti_reference'
    },
    brentReference: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'brent_reference'
    },
    usdDopReference: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'usd_dop_reference'
    },
    governmentNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'government_notes'
    },
    source: {
        type: DataTypes.STRING(60),
        allowNull: false,
        defaultValue: 'MICM / Presidencia'
    },
    sourceBulletinUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'source_bulletin_url'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'fuel_policy_weeks',
    timestamps: true,
    underscored: true
});

/**
 * Telemetría y estado operativo del proveedor de combustibles
 */
export const FuelSourceHealth = sequelize.define('FuelSourceHealth', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    source: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'MICM'
    },
    requestType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'WEEKLY_BULLETIN',
        field: 'request_type'
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
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'fuel_source_healths',
    timestamps: true,
    underscored: true
});

FuelCatalog.hasMany(FuelPriceObservation, { foreignKey: 'fuel_id', as: 'observations' });
FuelPriceObservation.belongsTo(FuelCatalog, { foreignKey: 'fuel_id', as: 'catalog' });
