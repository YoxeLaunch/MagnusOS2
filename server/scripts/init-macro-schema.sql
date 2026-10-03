-- ============================================================================
-- MACRO RD & MAGNUS EVENT NOTIFICATION SCHEMA MIGRATION (POSTGRESQL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS macro_indicators (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    frequency VARCHAR(30) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    source VARCHAR(100) NOT NULL DEFAULT 'BCRD',
    source_url VARCHAR(255),
    description TEXT,
    magnus_interpretation TEXT,
    preferred_chart_type VARCHAR(20) NOT NULL DEFAULT 'line',
    priority_order INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_macro_indicators_category ON macro_indicators(category);
CREATE INDEX IF NOT EXISTS idx_macro_indicators_priority ON macro_indicators(priority_order);

CREATE TABLE IF NOT EXISTS macro_observations (
    id SERIAL PRIMARY KEY,
    indicator_id VARCHAR(50) NOT NULL,
    reference_period VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(30) NOT NULL,
    frequency VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
    published_at TIMESTAMP WITH TIME ZONE,
    observed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(100) NOT NULL DEFAULT 'BCRD',
    source_url VARCHAR(255),
    revision INTEGER NOT NULL DEFAULT 1,
    original_value DOUBLE PRECISION,
    previous_value DOUBLE PRECISION,
    change_absolute DOUBLE PRECISION,
    change_percent DOUBLE PRECISION,
    is_derived BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_macro_obs_indicator_period UNIQUE (indicator_id, reference_period)
);

CREATE INDEX IF NOT EXISTS idx_macro_obs_indicator ON macro_observations(indicator_id);
CREATE INDEX IF NOT EXISTS idx_macro_obs_period ON macro_observations(reference_period);
CREATE INDEX IF NOT EXISTS idx_macro_obs_observed ON macro_observations(observed_at);

CREATE TABLE IF NOT EXISTS macro_source_healths (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL DEFAULT 'BCRD',
    indicator_id VARCHAR(50),
    success BOOLEAN NOT NULL,
    http_status INTEGER,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    records_received INTEGER NOT NULL DEFAULT 0,
    error_type VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_macro_health_source ON macro_source_healths(source);
CREATE INDEX IF NOT EXISTS idx_macro_health_timestamp ON macro_source_healths(timestamp);

DO $$ BEGIN
    CREATE TYPE enum_magnus_events_severity AS ENUM ('INFO', 'WATCH', 'IMPORTANT', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS magnus_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    domain VARCHAR(30) NOT NULL DEFAULT 'MACRO_RD',
    indicator_id VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity enum_magnus_events_severity NOT NULL DEFAULT 'INFO',
    reference_period VARCHAR(50),
    value_before DOUBLE PRECISION,
    value_after DOUBLE PRECISION NOT NULL,
    delta DOUBLE PRECISION,
    unit VARCHAR(30),
    idempotency_key VARCHAR(150) NOT NULL UNIQUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_magnus_events_indicator ON magnus_events(indicator_id);
CREATE INDEX IF NOT EXISTS idx_magnus_events_severity ON magnus_events(severity);
CREATE INDEX IF NOT EXISTS idx_magnus_events_created_at ON magnus_events(created_at);

CREATE TABLE IF NOT EXISTS magnus_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID,
    user_id VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    link_url VARCHAR(255) DEFAULT '/finanza/mercado',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_magnus_notif_user ON magnus_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_magnus_notif_is_read ON magnus_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_magnus_notif_created_at ON magnus_notifications(created_at);
