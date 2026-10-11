-- ============================================================================
-- PROVIDENCE FX // REMEDIATION D2: CLASIFICACIÓN Y DIVISA DGII (ID 16)
-- Transaccional, Idempotente y Reversible
-- Requiere autorización expresa antes de ejecución en producción.
-- ============================================================================

BEGIN;

-- 1. Verificación previa de existencia y estado original
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.fx_rate_observations
    WHERE id = 16 
      AND institution_id = 'dgii'
      AND rate_type = 'RETAIL_BANK'
      AND base_currency = 'USD';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Abortando: El registro ID 16 no coincide con el estado original esperado (count = %)', v_count;
    END IF;
END $$;

-- 2. Actualización puntual controlada
UPDATE public.fx_rate_observations
SET 
    institution_name = 'DGII',
    rate_type = 'OFFICIAL_REFERENCE',
    base_currency = 'EUR',
    confidence = 1.0,
    validation_status = 'VERIFIED',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'audit_correction', 'integrity_shield_remediation_2026',
        'corrected_at', NOW(),
        'original_rate_type', 'RETAIL_BANK',
        'original_base_currency', 'USD',
        'original_institution_name', 'Dgii',
        'original_validation_status', 'CONFLICT',
        'original_confidence', 0.3,
        'evidence', 'Tasa 67.6734 corresponde a la cotización oficial EUR/DOP de la DGII para 2026-10-02 comprobada contra registros DGII EUR (id=57, 97, 15799). La tasa oficial USD de la DGII en esa fecha fue 59.8986 (id=40).'
    )
WHERE id = 16 
  AND institution_id = 'dgii' 
  AND rate_type = 'RETAIL_BANK' 
  AND base_currency = 'USD';

-- 3. Verificación post-aplicación
DO $$
DECLARE
    v_updated_count integer;
BEGIN
    SELECT COUNT(*) INTO v_updated_count
    FROM public.fx_rate_observations
    WHERE id = 16 
      AND institution_id = 'dgii'
      AND rate_type = 'OFFICIAL_REFERENCE'
      AND base_currency = 'EUR';

    IF v_updated_count <> 1 THEN
        RAISE EXCEPTION 'Fallo en verificación post-actualización para ID 16';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- SCRIPT DE REVERSIÓN CONDICIONADA (ROLLBACK):
--
-- BEGIN;
-- UPDATE public.fx_rate_observations
-- SET 
--     institution_name = 'Dgii',
--     rate_type = 'RETAIL_BANK',
--     base_currency = 'USD',
--     confidence = 0.3,
--     validation_status = 'CONFLICT',
--     metadata = metadata - 'audit_correction' - 'corrected_at' - 'original_rate_type' - 'original_base_currency' - 'original_institution_name' - 'original_validation_status' - 'original_confidence' - 'evidence'
-- WHERE id = 16 
--   AND institution_id = 'dgii' 
--   AND metadata->>'audit_correction' = 'integrity_shield_remediation_2026';
-- COMMIT;
-- ============================================================================
