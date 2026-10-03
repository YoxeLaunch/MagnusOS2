/**
 * ============================================================================
 * MACRO RD // DATABASE MODELS (SEQUELIZE)
 * Indicadores macroeconómicos dominicanos, observaciones históricas y salud
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Catálogo maestro de indicadores macroeconómicos
 */
export const MacroIndicator = sequelize.define('MacroIndicator', {
    id: {
        type: DataTypes.STRING(50),
        primaryKey: true // ej: 'INFLATION_YOY', 'TPM', 'IMAE_YOY', 'RESERVES_NET'
    },
    name: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    shortName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'short_name'
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false, // 'PRICES', 'MONETARY_POLICY', 'BANKING', 'ACTIVITY', 'CREDIT', 'EXTERNAL', 'FX', 'DERIVED'
        field: 'category'
    },
    frequency: {
        type: DataTypes.STRING(30),
        allowNull: false, // 'INTRADAY', 'DAILY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'EVENT_DRIVEN'
        field: 'frequency'
    },
    unit: {
        type: DataTypes.STRING(30),
        allowNull: false // '%', 'US$ MM', 'RD$', 'PTS'
    },
    source: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'BCRD'
    },
    sourceUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'source_url'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    magnusInterpretation: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'magnus_interpretation'
    },
    preferredChartType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'line', // 'line' | 'step' | 'bar'
        field: 'preferred_chart_type'
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
    tableName: 'macro_indicators',
    timestamps: true,
    underscored: true
});

/**
 * Observaciones y series históricas reales de indicadores
 */
export const MacroObservation = sequelize.define('MacroObservation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    indicatorId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'indicator_id'
    },
    referencePeriod: {
        type: DataTypes.STRING(50),
        allowNull: false, // ej: '2026-08', 'Agosto 2026', '2026-10-02'
        field: 'reference_period'
    },
    value: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    unit: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    frequency: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'MONTHLY'
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
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'BCRD'
    },
    sourceUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'source_url'
    },
    revision: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    originalValue: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'original_value'
    },
    previousValue: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'previous_value'
    },
    changeAbsolute: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'change_absolute'
    },
    changePercent: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'change_percent'
    },
    isDerived: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_derived'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'macro_observations',
    timestamps: true,
    underscored: true
});

/**
 * Telemetría y estado operativo de fuentes oficiales
 */
export const MacroSourceHealth = sequelize.define('MacroSourceHealth', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    source: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'BCRD'
    },
    indicatorId: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'indicator_id'
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
    tableName: 'macro_source_healths',
    timestamps: true,
    underscored: true
});
