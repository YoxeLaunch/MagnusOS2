/**
 * ============================================================================
 * MACRO RD & MAGNUS EVENT ENGINE // AUTOMATED TEST SUITE
 * Tests unitarios y de integración para ingesta, parser, eventos y persistencia
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { BcrdMacroProvider } from '../server/services/macro/bcrdMacroProvider.js';
import { MagnusEventEngine } from '../server/services/macro/eventEngine.js';
import { MacroService, MASTER_INDICATORS } from '../server/services/macro/macroService.js';
import {
    MacroIndicator,
    MacroObservation,
    MacroSourceHealth,
    MagnusEvent,
    MagnusNotification,
    sequelize,
    initDb
} from '../server/models/index.js';

test.before(async () => {
    await initDb();
    await MagnusNotification.destroy({ where: {} }).catch(() => {});
    await MagnusEvent.destroy({ where: { domain: 'MACRO_RD' } }).catch(() => {});
});

test('1. Master Catalog: Debe contener los 11+ indicadores dominicanos requeridos', () => {
    assert.ok(MASTER_INDICATORS.length >= 11, 'Deben existir al menos 11 indicadores en el catálogo');
    const ids = MASTER_INDICATORS.map(i => i.id);
    assert.ok(ids.includes('INFLATION_YOY'), 'Debe incluir Inflación Interanual');
    assert.ok(ids.includes('TPM'), 'Debe incluir Tasa de Política Monetaria');
    assert.ok(ids.includes('RATE_ACTIVE'), 'Debe incluir Tasa Activa Promedio');
    assert.ok(ids.includes('RATE_PASSIVE'), 'Debe incluir Tasa Pasiva Promedio');
    assert.ok(ids.includes('IMAE_YOY'), 'Debe incluir IMAE');
    assert.ok(ids.includes('PRIVATE_CREDIT_YOY'), 'Debe incluir Crédito Privado');
    assert.ok(ids.includes('RESERVES_NET'), 'Debe incluir Reservas Netas');
    assert.ok(ids.includes('USD_DOP_BCRD'), 'Debe incluir USD/DOP BCRD');
});

test('2. Frecuencias oficiales: Cada indicador debe declarar su frecuencia correcta', () => {
    const tpm = MASTER_INDICATORS.find(i => i.id === 'TPM');
    assert.equal(tpm?.frequency, 'EVENT_DRIVEN', 'TPM debe ser EVENT_DRIVEN');

    const ipc = MASTER_INDICATORS.find(i => i.id === 'INFLATION_YOY');
    assert.equal(ipc?.frequency, 'MONTHLY', 'Inflación debe ser MONTHLY');

    const imae = MASTER_INDICATORS.find(i => i.id === 'IMAE_YOY');
    assert.equal(imae?.frequency, 'MONTHLY', 'IMAE debe ser MONTHLY');

    const fx = MASTER_INDICATORS.find(i => i.id === 'USD_DOP_BCRD');
    assert.equal(fx?.frequency, 'DAILY', 'USD/DOP debe ser DAILY');
});

test('3. BCRD Provider: Debe extraer observaciones válidas con números finitos y periodos reales', async () => {
    const provider = new BcrdMacroProvider();
    const result = await provider.fetchMacroIndicators();

    assert.ok(result.observations.length >= 8, 'Debe extraer al menos 8 observaciones oficiales');
    assert.ok(result.latencyMs > 0, 'Debe medir latencia en milisegundos');

    for (const obs of result.observations) {
        assert.ok(typeof obs.value === 'number' && Number.isFinite(obs.value), `Valor de ${obs.indicatorId} debe ser numérico finito`);
        assert.ok(obs.referencePeriod && obs.referencePeriod.length > 2, `Periodo de ${obs.indicatorId} debe estar presente`);
        assert.ok(obs.unit, `Unidad de ${obs.indicatorId} debe estar definida`);
        assert.equal(obs.source, 'BCRD', 'Fuente debe ser BCRD');
    }
});

test('4. Event Engine: Detección de nueva publicación y cálculo de delta', async () => {
    const engine = new MagnusEventEngine();

    const previousObs = {
        indicatorId: 'TPM',
        indicatorName: 'Tasa de Política Monetaria',
        referencePeriod: 'Agosto 2026',
        value: 5.25,
        unit: '%'
    };

    const currentObs = {
        indicatorId: 'TPM',
        indicatorName: 'Tasa de Política Monetaria',
        referencePeriod: 'Septiembre 2026',
        value: 5.50,
        unit: '%',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/'
    };

    const res = await engine.evaluateObservation(currentObs, previousObs);
    assert.ok(res, 'Debe generar un evento ante una nueva decisión');
    assert.equal(res.event.eventType, 'VALUE_CHANGE');
    assert.equal(res.event.severity, 'WATCH', 'Un cambio de 25 pb en TPM debe ser severidad WATCH');
    assert.equal(res.event.delta, 0.25);
    assert.ok(res.event.idempotencyKey.includes('TPM:Septiembre 2026:5.5'));
});

test('5. Event Engine: Detección de cambio importante (> 50 pb en TPM)', async () => {
    const engine = new MagnusEventEngine();

    const previousObs = {
        indicatorId: 'TPM',
        indicatorName: 'Tasa de Política Monetaria',
        referencePeriod: 'Enero 2026',
        value: 6.00,
        unit: '%'
    };

    const currentObs = {
        indicatorId: 'TPM',
        indicatorName: 'Tasa de Política Monetaria',
        referencePeriod: 'Febrero 2026',
        value: 5.25,
        unit: '%',
        source: 'BCRD'
    };

    const res = await engine.evaluateObservation(currentObs, previousObs);
    assert.ok(res, 'Debe generar un evento');
    assert.equal(res.event.severity, 'IMPORTANT', 'Un cambio >= 50 pb debe ser IMPORTANT');
});

test('6. Event Engine Idempotencia: No debe emitir eventos duplicados para la misma observación', async () => {
    const engine = new MagnusEventEngine();

    const obs = {
        indicatorId: 'INFLATION_YOY',
        indicatorName: 'Inflación Interanual',
        referencePeriod: 'PeriodoPruebaIdempotente',
        value: 4.88,
        unit: '%',
        source: 'BCRD'
    };

    // Primera evaluación -> Genera evento
    const first = await engine.evaluateObservation(obs, null);
    // Segunda evaluación idéntica -> Debe retornar null (descartado por idempotencia)
    const second = await engine.evaluateObservation(obs, null);

    assert.equal(second, null, 'No debe generar evento repetido si ya fue registrado');
});

test('7. Métricas Derivadas: Cálculo de Tasa Real Simple y Spread Bancario', async () => {
    const service = new MacroService();
    const summary = await service.getMacroSummary();

    assert.ok(summary.derivedMetrics, 'Debe incluir derivedMetrics');
    assert.ok('realRateSimple' in summary.derivedMetrics, 'Debe incluir Tasa Real Simple');
    assert.ok('bankingSpread' in summary.derivedMetrics, 'Debe incluir Spread Bancario');

    assert.equal(summary.derivedMetrics.realRateSimple.type, 'DERIVED', 'Tipo de métrica debe ser DERIVED');
    assert.equal(summary.derivedMetrics.realRateSimple.source, 'MAGNUS', 'Fuente de métrica derivada debe ser MAGNUS');
    assert.equal(summary.derivedMetrics.bankingSpread.source, 'MAGNUS', 'Fuente del Spread debe ser MAGNUS');

    if (summary.derivedMetrics.realRateSimple.value !== null) {
        assert.ok(Number.isFinite(summary.derivedMetrics.realRateSimple.value));
    }
    if (summary.derivedMetrics.bankingSpread.value !== null) {
        assert.ok(summary.derivedMetrics.bankingSpread.value > 0, 'Spread activo - pasivo debe ser positivo');
    }
});

test('8. Persistencia y Fallback: No borrar último dato si el proveedor falla', async () => {
    const service = new MacroService();
    // Simular que el proveedor de red falla
    service.bcrdProvider.baseUrl = 'https://www.bancentral.gov.do/ruta_inexistente_de_prueba_404';

    const degradedSummary = await service.getMacroSummary({ forceRefresh: true });
    assert.ok(degradedSummary.kpis.length >= 8, 'Debe conservar los datos válidos previos desde la base de datos');
    assert.ok(degradedSummary.status === 'DEGRADED' || degradedSummary.status === 'ONLINE');
});

test('9. Regresión Providence FX: getUsdDopRates debe seguir operativo sin alteración', async () => {
    const { fxService } = await import('../server/services/fx/fxService.js');
    const fxData = await fxService.getUsdDopRates();
    assert.ok(fxData, 'Providence FX debe retornar objeto de tasas');
    assert.ok(fxData.summary, 'Providence FX summary debe existir');
});
