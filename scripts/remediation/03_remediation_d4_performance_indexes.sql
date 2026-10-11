-- ============================================================================
-- PROVIDENCE FX // REMEDIATION D4: ÍNDICES COMPUESTOS DE ALTO RENDIMIENTO
-- Elimina external merge sorts en disco y habilita Index Scans deterministas
--
-- NOTA TÉCNICA DE PRODUCCIÓN:
-- CREATE INDEX CONCURRENTLY NO puede ejecutarse dentro de un bloque BEGIN/COMMIT.
-- Cada sentencia debe ejecutarse de forma independiente en modo autocommit.
-- No bloquea lecturas ni escrituras concurrentes del scheduler LIVE.
-- ============================================================================

-- 1. Índice para consultas filtradas por proveedor, divisa y ordenadas por fecha económica
CREATE INDEX CONCURRENTLY IF NOT EXISTS fx_rate_obs_prov_curr_econ_date_idx 
ON public.fx_rate_observations USING btree (provider, base_currency, economic_date);

-- 2. Índice para consultas que ordenan deterministamente por fecha económica e ID primario
CREATE INDEX CONCURRENTLY IF NOT EXISTS fx_rate_obs_econ_date_id_idx 
ON public.fx_rate_observations USING btree (economic_date, id);

-- 3. Verificación de creación e índices válidos (indisvalid = true):
-- SELECT indexrelid::regclass, indisvalid, indisready 
-- FROM pg_index 
-- WHERE indexrelid::regclass::text IN ('fx_rate_obs_prov_curr_econ_date_idx', 'fx_rate_obs_econ_date_id_idx');

-- ============================================================================
-- SCRIPT DE REVERSIÓN (ROLLBACK):
-- DROP INDEX CONCURRENTLY IF EXISTS public.fx_rate_obs_prov_curr_econ_date_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS public.fx_rate_obs_econ_date_id_idx;
-- ============================================================================
