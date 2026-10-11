-- ============================================================================
-- PROVIDENCE FX // REMEDIATION D4: ÍNDICES COMPUESTOS DE ALTO RENDIMIENTO
-- Elimina external merge sorts en disco y habilita Index Scans deterministas
-- ============================================================================

-- Índice para consultas filtradas por proveedor, moneda y ordenadas por fecha económica
CREATE INDEX CONCURRENTLY IF NOT EXISTS fx_rate_obs_prov_curr_econ_date_idx 
ON public.fx_rate_observations USING btree (provider, base_currency, economic_date);

-- Índice para consultas que ordenan deterministamente por fecha económica e ID primario
CREATE INDEX CONCURRENTLY IF NOT EXISTS fx_rate_obs_econ_date_id_idx 
ON public.fx_rate_observations USING btree (economic_date, id);

-- ============================================================================
-- SCRIPT DE REVERSIÓN (ROLLBACK):
--
-- DROP INDEX CONCURRENTLY IF EXISTS public.fx_rate_obs_prov_curr_econ_date_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS public.fx_rate_obs_econ_date_id_idx;
-- ============================================================================
