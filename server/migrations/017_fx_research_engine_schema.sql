-- ============================================================================
-- PROVIDENCE FX // MIGRATION 017: QUANTITATIVE RESEARCH ENGINE SCHEMA
-- Dedicated decoupled schema for Econometric Lab Level 3
-- Completely separated from live trading/rates tables (zero interference)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fx_research_experiments (
    id VARCHAR(64) PRIMARY KEY,
    model_id VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    base_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    quote_currency VARCHAR(10) NOT NULL DEFAULT 'DOP',
    source_provider VARCHAR(50) NOT NULL DEFAULT 'bcrd',
    horizon_days INTEGER NOT NULL DEFAULT 1,
    train_start_date DATE NOT NULL,
    train_end_date DATE NOT NULL,
    test_start_date DATE NOT NULL,
    test_end_date DATE NOT NULL,
    observations_count INTEGER NOT NULL,
    dataset_hash VARCHAR(64) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    runtime_ms INTEGER NOT NULL DEFAULT 0,
    peak_memory_mb NUMERIC(8, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fx_research_exp_model_idx ON public.fx_research_experiments (model_id, base_currency);
CREATE INDEX IF NOT EXISTS fx_research_exp_created_idx ON public.fx_research_experiments (created_at DESC);

CREATE TABLE IF NOT EXISTS public.fx_research_forecasts (
    id SERIAL PRIMARY KEY,
    experiment_id VARCHAR(64) NOT NULL REFERENCES public.fx_research_experiments(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    horizon INTEGER NOT NULL,
    actual_value NUMERIC(12, 6),
    predicted_value NUMERIC(12, 6) NOT NULL,
    lower_95 NUMERIC(12, 6),
    upper_95 NUMERIC(12, 6),
    error NUMERIC(12, 6),
    error_pct NUMERIC(8, 4),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fx_research_fc_exp_idx ON public.fx_research_forecasts (experiment_id, target_date ASC);
