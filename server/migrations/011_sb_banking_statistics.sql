-- Migration 011: Superintendencia de Bancos (SB) Banking Statistics Integration
-- Persistence of banking deposits, interest yields, and institutional sync runs

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

-- 1. Table for banking metrics by locality, institution, currency, and holder type
CREATE TABLE IF NOT EXISTS public.sb_banking_metrics (
    id SERIAL PRIMARY KEY,
    periodo VARCHAR(7) NOT NULL,                           -- 'YYYY-MM' (e.g. '2026-08')
    tipo_entidad VARCHAR(50) NOT NULL,                     -- 'Bancos Múltiples', 'Asociaciones de Ahorros y Préstamos', etc.
    entidad VARCHAR(100) NOT NULL,                         -- 'BANRESERVAS', 'POPULAR', 'BHD', etc.
    region VARCHAR(100),                                   -- 'Región Ozama', 'Región Norte', etc.
    provincia VARCHAR(100) NOT NULL,                       -- 'DISTRITO NACIONAL', 'SANTIAGO', etc.
    codigo_iso VARCHAR(10),                                -- 'DO-01', etc.
    persona VARCHAR(50) NOT NULL,                          -- 'Persona física' | 'Persona jurídica'
    divisa VARCHAR(50) NOT NULL,                           -- Raw label from SB API ('PESO DOMINICANO', 'DÓLAR ESTADOUNIDENSE', 'EURO')
    currency_iso VARCHAR(5) NOT NULL,                      -- Normalized ISO code ('DOP', 'USD', 'EUR')
    cantidad_instrumentos BIGINT NOT NULL DEFAULT 0,
    balance NUMERIC(20, 2) NOT NULL DEFAULT 0,
    tasa_ponderada_balance NUMERIC(28, 4) NOT NULL DEFAULT 0, -- Product: balance * tasa (for weighted average aggregations)
    tasa_ponderada NUMERIC(10, 4) NOT NULL DEFAULT 0,         -- Nominal weighted rate (%)
    retrieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sb_banking_metric UNIQUE (periodo, entidad, tipo_entidad, provincia, persona, divisa)
);

CREATE INDEX IF NOT EXISTS idx_sb_metrics_periodo ON public.sb_banking_metrics(periodo);
CREATE INDEX IF NOT EXISTS idx_sb_metrics_entidad ON public.sb_banking_metrics(entidad);
CREATE INDEX IF NOT EXISTS idx_sb_metrics_currency_iso ON public.sb_banking_metrics(currency_iso);
CREATE INDEX IF NOT EXISTS idx_sb_metrics_provincia ON public.sb_banking_metrics(provincia);
CREATE INDEX IF NOT EXISTS idx_sb_metrics_persona ON public.sb_banking_metrics(persona);
CREATE INDEX IF NOT EXISTS idx_sb_metrics_lookup ON public.sb_banking_metrics(periodo, entidad, currency_iso);

-- 2. Table for tracking monthly sync runs & telemetry
CREATE TABLE IF NOT EXISTS public.sb_sync_runs (
    id SERIAL PRIMARY KEY,
    periodo VARCHAR(7) NOT NULL,
    entity_type VARCHAR(20),                               -- 'BM', 'AAyP', 'BAyC', or 'ALL'
    status VARCHAR(20) NOT NULL,                           -- 'SUCCESS', 'FAILED', 'EMPTY', 'PARTIAL'
    records_received INTEGER NOT NULL DEFAULT 0,
    records_inserted INTEGER NOT NULL DEFAULT 0,
    records_updated INTEGER NOT NULL DEFAULT 0,
    records_unchanged INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    active_key_used VARCHAR(20) NOT NULL DEFAULT 'PRIMARY', -- 'PRIMARY' | 'SECONDARY'
    error_message TEXT,
    metadata JSONB,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sb_sync_runs_periodo ON public.sb_sync_runs(periodo);
CREATE INDEX IF NOT EXISTS idx_sb_sync_runs_executed ON public.sb_sync_runs(executed_at DESC);
