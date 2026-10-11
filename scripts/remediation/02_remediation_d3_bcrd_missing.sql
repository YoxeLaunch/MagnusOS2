-- ============================================================================
-- PROVIDENCE FX // REMEDIATION D3: DOS OBSERVACIONES HISTÓRICAS BCRD FALTANTES
-- Inserción Transaccional, Idempotente y Reversible
-- Fechas: 1991-01-25 (Anomalía oficial spread invertido) y 2024-07-24 (Omisión API)
-- Requiere autorización expresa antes de ejecución en producción.
-- ============================================================================

BEGIN;

-- 1. Verificación previa de ausencia
DO $$
DECLARE
    v_existing integer;
BEGIN
    SELECT COUNT(*) INTO v_existing
    FROM public.fx_rate_observations
    WHERE provider = 'bcrd' 
      AND base_currency = 'USD' 
      AND economic_date IN ('1991-01-25', '2024-07-24');

    IF v_existing > 0 THEN
        RAISE NOTICE 'Advertencia: Ya existen % observaciones BCRD para las fechas especificadas', v_existing;
    END IF;
END $$;

-- 2. Inserción de la observación 1991-01-25 (Anomalía Oficial BCRD Spread Invertido)
INSERT INTO public.fx_rate_observations (
    observed_at,
    provider,
    institution_id,
    institution_name,
    rate_type,
    base_currency,
    quote_currency,
    buy,
    sell,
    mid,
    spread,
    confidence,
    validation_status,
    provider_updated_at,
    buy_exact,
    sell_exact,
    mid_exact,
    spread_exact,
    economic_date,
    provenance_hash,
    metadata,
    "createdAt",
    "updatedAt"
) VALUES (
    '1991-01-25 00:00:00+00',
    'bcrd',
    'bcrd',
    'Banco Central de la República Dominicana',
    'OFFICIAL_REFERENCE',
    'USD',
    'DOP',
    11.70,
    11.50,
    11.60,
    -0.20,
    1.0,
    'OFFICIAL_ANOMALY',
    '1991-01-25 00:00:00+00',
    11.700000,
    11.500000,
    11.600000,
    -0.200000,
    '1991-01-25',
    'dc97411888ba810354faf034f73c578daf596ee15dfe91a92c2a67cef9e7f3ac',
    jsonb_build_object(
        'source', 'bcrd_official_excel_sheet_diaria',
        'row', 20,
        'is_official_anomaly', true,
        'anomaly_type', 'inverted_spread',
        'remediation_ref', 'integrity_shield_remediation_2026',
        'inserted_at', NOW(),
        'official_note', 'El BCRD publicó oficialmente Compra=11.70 y Venta=11.50 en la Hoja Diaria de TASA_DOLAR_REFERENCIA_MC.xlsx. Preservado con fidelidad histórica; dato no operable para arbitraje comercial.'
    ),
    NOW(),
    NOW()
) ON CONFLICT (provider, institution_id, base_currency, quote_currency, rate_type, observed_at) DO NOTHING;

-- 3. Inserción de la observación 2024-07-24 (Recuperada de Excel oficial)
INSERT INTO public.fx_rate_observations (
    observed_at,
    provider,
    institution_id,
    institution_name,
    rate_type,
    base_currency,
    quote_currency,
    buy,
    sell,
    mid,
    spread,
    confidence,
    validation_status,
    provider_updated_at,
    buy_exact,
    sell_exact,
    mid_exact,
    spread_exact,
    economic_date,
    provenance_hash,
    metadata,
    "createdAt",
    "updatedAt"
) VALUES (
    '2024-07-24 00:00:00+00',
    'bcrd',
    'bcrd',
    'Banco Central de la República Dominicana',
    'OFFICIAL_REFERENCE',
    'USD',
    'DOP',
    59.0029,
    59.3884,
    59.19565,
    0.3855,
    1.0,
    'VERIFIED',
    '2024-07-24 00:00:00+00',
    59.002900,
    59.388400,
    59.195650,
    0.385500,
    '2024-07-24',
    '1de1d43a4e70ce7a903dd665019e927f6ab57c68dc1ffebd8eb4c7d3f0f7508c',
    jsonb_build_object(
        'source', 'bcrd_official_excel_sheet_diaria',
        'row', 8431,
        'remediation_ref', 'integrity_shield_remediation_2026',
        'inserted_at', NOW(),
        'note', 'Observación histórica recuperada de TASA_DOLAR_REFERENCIA_MC.xlsx tras omisión en la API web JSON del BCRD.'
    ),
    NOW(),
    NOW()
) ON CONFLICT (provider, institution_id, base_currency, quote_currency, rate_type, observed_at) DO NOTHING;

-- 4. Verificación post-inserción: debe alcanzar 8,980 registros BCRD USD
DO $$
DECLARE
    v_total_bcrd_usd integer;
BEGIN
    SELECT COUNT(*) INTO v_total_bcrd_usd
    FROM public.fx_rate_observations
    WHERE provider = 'bcrd' AND base_currency = 'USD';

    IF v_total_bcrd_usd <> 8980 THEN
        RAISE EXCEPTION 'Fallo en verificación post-inserción: se esperaban 8980 registros BCRD USD, encontrados %', v_total_bcrd_usd;
    END IF;
    RAISE NOTICE 'Verificación exitosa: Total BCRD USD = 8980 observaciones exactas';
END $$;

COMMIT;

-- ============================================================================
-- SCRIPT DE REVERSIÓN CONDICIONADA (ROLLBACK TARGETED):
--
-- BEGIN;
-- DELETE FROM public.fx_rate_observations
-- WHERE provider = 'bcrd' 
--   AND base_currency = 'USD' 
--   AND metadata->>'remediation_ref' = 'integrity_shield_remediation_2026'
--   AND economic_date IN ('1991-01-25', '2024-07-24');
-- COMMIT;
-- ============================================================================
