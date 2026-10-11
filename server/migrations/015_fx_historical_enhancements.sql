-- Migration 015: Providence FX Historical Integrity and Provenance Enhancements
-- Adds metadata JSONB, provenance_hash, and economic_date for historical backfill and econometric modeling.
-- Preserves backward compatibility and avoids destructive schema changes.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '1min';

DO $$
BEGIN
    -- 1. Add metadata JSONB column for audit trails and payload provenance
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'fx_rate_observations' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.fx_rate_observations ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Added metadata JSONB to fx_rate_observations';
    END IF;

    -- 2. Add provenance_hash VARCHAR(64) for SHA-256 deduplication and verification
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'fx_rate_observations' AND column_name = 'provenance_hash'
    ) THEN
        ALTER TABLE public.fx_rate_observations ADD COLUMN provenance_hash VARCHAR(64);
        RAISE NOTICE 'Added provenance_hash to fx_rate_observations';
    END IF;

    -- 3. Add economic_date DATE for exact time-series indexing and historical filtering
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'fx_rate_observations' AND column_name = 'economic_date'
    ) THEN
        ALTER TABLE public.fx_rate_observations ADD COLUMN economic_date DATE;
        RAISE NOTICE 'Added economic_date to fx_rate_observations';
    END IF;
END $$;

-- Populate economic_date for existing records from observed_at in Dominican local time
UPDATE public.fx_rate_observations
SET economic_date = (observed_at AT TIME ZONE 'America/Santo_Domingo')::date
WHERE economic_date IS NULL;

-- 4. Create unique index for idempotent backfilling without duplicates
CREATE UNIQUE INDEX IF NOT EXISTS fx_rate_obs_unique_idx
ON public.fx_rate_observations (provider, institution_id, base_currency, quote_currency, rate_type, observed_at);

-- 5. Create performance indexes for multi-year time-series filtering
CREATE INDEX IF NOT EXISTS fx_rate_obs_econ_date_idx
ON public.fx_rate_observations (economic_date);

CREATE INDEX IF NOT EXISTS fx_rate_obs_base_curr_econ_date_idx
ON public.fx_rate_observations (base_currency, economic_date);

CREATE INDEX IF NOT EXISTS fx_rate_obs_inst_curr_econ_date_idx
ON public.fx_rate_observations (institution_id, base_currency, economic_date);
