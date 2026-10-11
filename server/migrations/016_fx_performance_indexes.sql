-- Migration 016: High-Performance Composite Indexes for Providence FX
-- Aligned with economic_date queries and deterministic sorting

CREATE INDEX IF NOT EXISTS fx_rate_obs_prov_curr_econ_date_idx 
ON public.fx_rate_observations USING btree (provider, base_currency, economic_date);

CREATE INDEX IF NOT EXISTS fx_rate_obs_econ_date_id_idx 
ON public.fx_rate_observations USING btree (economic_date, id);
