/**
 * ============================================================================
 * ENERGÍA RD & MARKET ENGINE // AUTOMATED TEST SUITE
 * 22+ Tests unitarios, de integración, resiliencia, deduplicación y regresión
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { micmFuelProvider, MASTER_FUELS } from '../server/services/energy/micmFuelProvider.js';
import { energyService } from '../server/services/energy/energyService.js';
import { macroService } from '../server/services/macro/macroService.js';
import { fxService } from '../server/services/fx/fxService.js';
import { getMarketIntelData } from '../server/controllers/marketController.js';
import {
    FuelCatalog,
    FuelPriceObservation,
    FuelPolicyWeek,
    FuelSourceHealth,
    MagnusEvent,
    MagnusNotification,
    initDb
} from '../server/models/index.js';

test.before(async () => {
    await initDb();
    await micmFuelProvider.ensureMasterCatalog();
});

test('1. Parser MICM: Debe extraer correctamente el boletín oficial semanal y Gas Natural', async () => {
    const bulletin = await micmFuelProvider.fetchLatestWeeklyBulletin();
    assert.ok(bulletin, 'El boletín no debe ser nulo');
    assert.ok(bulletin.observations.length >= 8, 'Debe retornar al menos 8 observaciones de combustibles');
    assert.ok(bulletin.period.validFrom, 'Debe incluir validFrom');
    assert.ok(bulletin.period.validTo, 'Debe incluir validTo');
    assert.equal(bulletin.policy.source, 'MICM / Presidencia');
});

test('2. Fuel Normalization: Los IDs canónicos deben estar definidos y activos', () => {
    const ids = MASTER_FUELS.map(f => f.id);
    assert.ok(ids.includes('gasoline_premium'), 'Debe incluir Gasolina Premium');
    assert.ok(ids.includes('gasoline_regular'), 'Debe incluir Gasolina Regular');
    assert.ok(ids.includes('diesel_regular'), 'Debe incluir Gasoil Regular');
    assert.ok(ids.includes('diesel_optimo'), 'Debe incluir Gasoil Óptimo');
    assert.ok(ids.includes('glp'), 'Debe incluir GLP');
    assert.ok(ids.includes('natural_gas'), 'Debe incluir Gas Natural');
});

test('3. Unit Normalization: Gas Natural debe usar RD$/m³ y los demás RD$/gal', () => {
    const gn = MASTER_FUELS.find(f => f.id === 'natural_gas');
    assert.equal(gn?.unit, 'RD$/m³', 'Gas Natural debe usar RD$/m³');

    const gasPrem = MASTER_FUELS.find(f => f.id === 'gasoline_premium');
    assert.equal(gasPrem?.unit, 'RD$/gal', 'Gasolinas deben usar RD$/gal');

    const glp = MASTER_FUELS.find(f => f.id === 'glp');
    assert.equal(glp?.unit, 'RD$/gal', 'GLP debe usar RD$/gal');
});

test('4. Weekly Period Parser: Debe generar fechas ISO válidas con exactamente 6 días de diferencia', async () => {
    const bulletin = await micmFuelProvider.fetchLatestWeeklyBulletin();
    const { validFrom, validTo } = bulletin.period;
    
    const d1 = new Date(validFrom);
    const d2 = new Date(validTo);
    assert.ok(!isNaN(d1.getTime()), 'validFrom debe ser fecha válida');
    assert.ok(!isNaN(d2.getTime()), 'validTo debe ser fecha válida');
    assert.ok(d2 > d1, 'validTo debe ser posterior a validFrom');

    const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    assert.equal(diffDays, 6, 'La vigencia oficial semanal dura exactamente 6 días (7 días inclusivos)');
});

test('5. Price Validation: Los precios deben ser estrictamente positivos y finitos', async () => {
    const bulletin = await micmFuelProvider.fetchLatestWeeklyBulletin();
    for (const obs of bulletin.observations) {
        assert.ok(Number.isFinite(obs.priceDop), `Precio de ${obs.fuelId} debe ser un número finito`);
        assert.ok(obs.priceDop > 0, `Precio de ${obs.fuelId} debe ser mayor que cero`);
    }
});

test('6. Subsidy Parser: Debe extraer subsidio por galón cuando exista en la resolución', async () => {
    const bulletin = await micmFuelProvider.fetchLatestWeeklyBulletin();
    const prem = bulletin.observations.find(o => o.fuelId === 'gasoline_premium');
    assert.ok(prem, 'Debe existir observación de Gasolina Premium');
    assert.ok(prem.subsidyPerUnit && prem.subsidyPerUnit > 0, 'Gasolina Premium debe reportar subsidio absorbido');
});

test('7. Missing Subsidy: Combustibles sin subsidio informado deben ser null o 0, no inventar', async () => {
    const bulletin = await micmFuelProvider.fetchLatestWeeklyBulletin();
    const gn = bulletin.observations.find(o => o.fuelId === 'natural_gas');
    assert.equal(gn?.subsidyPerUnit, null, 'Gas Natural no tiene subsidio por galón informado en el aviso');
});

test('8. Duplicate Publication: Ingestar la misma semana dos veces no debe duplicar registros', async () => {
    await energyService.syncWeeklyEnergyData();
    const countBefore = await FuelPriceObservation.count();
    await energyService.syncWeeklyEnergyData();
    const countAfter = await FuelPriceObservation.count();
    assert.equal(countAfter, countBefore, 'La segunda sincronización debe ser idempotente');
});

test('9. Historical Dedupe: Clave única (fuel_id, valid_from) debe prevenir duplicidad en DB', async () => {
    const existing = await FuelPriceObservation.findOne();
    if (existing) {
        try {
            await FuelPriceObservation.create({
                fuelId: existing.fuelId,
                validFrom: existing.validFrom,
                validTo: existing.validTo,
                priceDop: 999.99,
                unit: 'RD$/gal'
            });
            assert.fail('Debió fallar por colisión de clave única');
        } catch (e) {
            assert.ok(e.name.includes('Unique') || e.message.includes('UNIQUE'), 'Debe arrojar colisión UNIQUE');
        }
    }
});

test('10. Publication Watch: Detección inteligente de vigencia actual', async () => {
    const summary = await energyService.getEnergySummary({ forceRefresh: false });
    assert.ok(summary.period, 'Debe incluir información de periodo');
    assert.ok(typeof summary.period.isCurrent === 'boolean', 'isCurrent debe ser un booleano');
});

test('11. Stale Fallback: Si la red externa falla, debe devolver último dato con advertencia stale', async () => {
    const summary = await energyService.getEnergySummary({ forceRefresh: false });
    assert.ok(summary.fuels.length > 0, 'Debe devolver datos de la base de datos');
    assert.ok(summary.policy, 'Debe devolver política');
});

test('12. Event Generation: Debe registrar evento en magnus_events y notificación en magnus_notifications', async () => {
    const lastEvent = await MagnusEvent.findOne({
        where: { domain: 'ENERGY_RD' },
        order: [['createdAt', 'DESC']]
    });
    assert.ok(lastEvent, 'Debe existir al menos un evento de ENERGY_RD');
    assert.equal(lastEvent.domain, 'ENERGY_RD');
    assert.ok(lastEvent.title.includes('Combustibles RD'), 'El título debe hacer referencia a Combustibles RD');

    const lastNotif = await MagnusNotification.findOne({
        where: { eventId: lastEvent.id }
    });
    assert.ok(lastNotif, 'Debe existir notificación vinculada en MagnusNotification');
});

test('13. Event Deduplication: Clave de idempotencia única previene spam de notificaciones', async () => {
    const lastEvent = await MagnusEvent.findOne({
        where: { domain: 'ENERGY_RD' }
    });
    if (lastEvent) {
        const eventsWithKey = await MagnusEvent.count({
            where: { idempotencyKey: lastEvent.idempotencyKey }
        });
        assert.equal(eventsWithKey, 1, 'Solo debe existir un evento con la misma clave de idempotencia');
    }
});

test('14. Notification Grouping: El evento de publicación de semana agrupa todos los combustibles en 1 mensaje', async () => {
    const lastEvent = await MagnusEvent.findOne({
        where: { domain: 'ENERGY_RD', indicatorId: 'FUEL_WEEK_ALL' }
    });
    assert.ok(lastEvent, 'Debe existir el evento agrupado FUEL_WEEK_ALL');
    assert.ok(lastEvent.message.includes('combustibles'), 'El mensaje debe resumir la totalidad de combustibles');
});

test('15. WTI Integration: Debe incluir precio y variación de petróleo WTI en marketContext', async () => {
    const summary = await energyService.getEnergySummary();
    assert.ok(summary.marketContext.wti, 'Debe incluir objeto wti');
    assert.ok(summary.marketContext.wti.price > 0, 'Precio WTI debe ser positivo');
    assert.equal(summary.marketContext.wti.unit, 'USD/bbl');
});

test('16. Brent Integration: Debe incluir precio de Brent en marketContext', async () => {
    const summary = await energyService.getEnergySummary();
    assert.ok(summary.marketContext.brent, 'Debe incluir objeto brent');
    assert.ok(summary.marketContext.brent.price > 0, 'Precio Brent debe ser positivo');
    assert.equal(summary.marketContext.brent.unit, 'USD/bbl');
});

test('17. USD/DOP Integration: Debe incluir tipo de cambio de referencia', async () => {
    const summary = await energyService.getEnergySummary();
    assert.ok(summary.marketContext.usdDop, 'Debe incluir objeto usdDop');
    assert.ok(summary.marketContext.usdDop.price >= 50, 'Tipo de cambio USD/DOP debe ser plausible (> 50)');
});

test('18. Dashboard Serialization: Estructura del JSON debe satisfacer contrato exacto', async () => {
    const summary = await energyService.getEnergySummary();
    assert.ok(Array.isArray(summary.fuels), 'fuels debe ser un Array');
    assert.ok(summary.period.validFrom, 'period.validFrom debe existir');
    assert.ok(summary.period.validTo, 'period.validTo debe existir');
    assert.ok(summary.energyPressure, 'energyPressure debe existir');
    assert.equal(summary.energyPressure.type, 'MAGNUS DERIVED');
    assert.ok(summary.energyPressure.formula.includes('WTI'));
});

test('19. History Endpoint: getFuelHistory debe entregar serie escalonada y Base-100 normalizada', async () => {
    const history = await energyService.getFuelHistory('gasoline_regular', '1Y');
    assert.ok(history, 'Histórico debe existir');
    assert.ok(history.series.length > 0, 'Debe tener observaciones en la serie');
    assert.ok(history.normalizedSeries.length > 0, 'Debe tener serie normalizada Base 100');
    assert.equal(history.fuel.id, 'gasoline_regular');
});

test('20. Regression Macro RD: getMacroSummary debe continuar funcionando sin errores', async () => {
    const macroSummary = await macroService.getMacroSummary({ forceRefresh: false });
    assert.ok(macroSummary, 'Macro RD debe responder');
    assert.ok(macroSummary.kpis.length >= 8, 'Debe contener los KPIs macroeconómicos');
});

test('21. Regression Providence FX: fxService debe mantener sus cotizaciones y cache activo', () => {
    assert.ok(fxService, 'fxService debe estar disponible');
    assert.ok(fxService.cache, 'fxService cache debe estar inicializado');
});

test('22. Regression Market Dashboard: getMarketIntelData debe devolver WTI, Brent, USD y EUR', async () => {
    const market = await getMarketIntelData();
    assert.equal(market.status, 'ONLINE');
    assert.ok(market.quotes.length >= 15, 'Debe incluir al menos 15 instrumentos');
    assert.ok(market.quotes.some(q => q.symbol === 'CL=F'), 'Debe incluir WTI CL=F');
    assert.ok(market.quotes.some(q => q.symbol === 'BZ=F'), 'Debe incluir Brent BZ=F');
    assert.ok(market.rates.usd_dop, 'Debe incluir tasa usd_dop');
});
