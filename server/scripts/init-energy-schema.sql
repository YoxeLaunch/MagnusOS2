-- ============================================================================
-- ENERGÍA RD // COMBUSTIBLES SCHEMA MIGRATION (POSTGRESQL)
-- Idempotente: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS fuel_catalogs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'PRIMARY', -- 'PRIMARY' | 'SECONDARY'
    unit VARCHAR(20) NOT NULL DEFAULT 'RD$/gal',
    description TEXT,
    priority_order INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fuel_catalogs_priority ON fuel_catalogs(priority_order);
CREATE INDEX IF NOT EXISTS idx_fuel_catalogs_category ON fuel_catalogs(category);

CREATE TABLE IF NOT EXISTS fuel_price_observations (
    id SERIAL PRIMARY KEY,
    fuel_id VARCHAR(50) NOT NULL,
    price_dop DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'RD$/gal',
    previous_price_dop DOUBLE PRECISION,
    change_dop DOUBLE PRECISION,
    change_percent DOUBLE PRECISION,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    observed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) NOT NULL DEFAULT 'MICM',
    source_url VARCHAR(255),
    subsidy_per_unit DOUBLE PRECISION,
    import_parity_price DOUBLE PRECISION,
    tax_ley_112_00 DOUBLE PRECISION,
    tax_ley_495_06 DOUBLE PRECISION,
    distribution_margin DOUBLE PRECISION,
    retail_margin DOUBLE PRECISION,
    transport_fee DOUBLE PRECISION,
    exchange_rate_reference DOUBLE PRECISION,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_fuel_price_fuel_validfrom UNIQUE (fuel_id, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_fuel_price_fuel_id ON fuel_price_observations(fuel_id);
CREATE INDEX IF NOT EXISTS idx_fuel_price_valid_from ON fuel_price_observations(valid_from);
CREATE INDEX IF NOT EXISTS idx_fuel_price_observed_at ON fuel_price_observations(observed_at);

CREATE TABLE IF NOT EXISTS fuel_policy_weeks (
    id VARCHAR(60) PRIMARY KEY, -- ej: 'WEEK-2026-10-03-2026-10-09'
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    total_subsidy_dop DOUBLE PRECISION,
    wti_reference DOUBLE PRECISION,
    brent_reference DOUBLE PRECISION,
    usd_dop_reference DOUBLE PRECISION,
    government_notes TEXT,
    source VARCHAR(60) NOT NULL DEFAULT 'MICM / Presidencia',
    source_bulletin_url VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_fuel_policy_valid_from UNIQUE (valid_from)
);

CREATE INDEX IF NOT EXISTS idx_fuel_policy_valid_from ON fuel_policy_weeks(valid_from);

CREATE TABLE IF NOT EXISTS fuel_source_healths (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL DEFAULT 'MICM',
    request_type VARCHAR(50) NOT NULL DEFAULT 'WEEKLY_BULLETIN',
    success BOOLEAN NOT NULL,
    http_status INTEGER,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    records_received INTEGER NOT NULL DEFAULT 0,
    error_type VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fuel_health_source ON fuel_source_healths(source);
CREATE INDEX IF NOT EXISTS idx_fuel_health_timestamp ON fuel_source_healths(timestamp);
