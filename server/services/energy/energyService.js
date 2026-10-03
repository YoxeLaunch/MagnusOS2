/**
 * ============================================================================
 * ENERGÍA RD // ORCHESTRATOR & ENERGY INTELLIGENCE SERVICE
 * Cache multi-frecuencia, persistencia histórica, correlación WTI/Brent/USD y eventos
 * ============================================================================
 */

import { micmFuelProvider, MASTER_FUELS } from './micmFuelProvider.js';
import { eventEngine } from '../macro/eventEngine.js';
import { getMarketIntelData } from '../../controllers/marketController.js';
import {
    FuelCatalog,
    FuelPriceObservation,
    FuelPolicyWeek,
    FuelSourceHealth,
    MagnusEvent,
    MagnusNotification,
    sequelize
} from '../../models/index.js';
import { Op } from 'sequelize';

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 Horas (datos semanales)

export class EnergyService {
    constructor() {
        this.cache = {
            data: null,
            timestamp: 0
        };
        this.isSyncing = false;
    }

    /**
     * Obtiene el dashboard consolidado de Energía RD con Stale-While-Revalidate
     */
    async getEnergySummary({ forceRefresh = false } = {}) {
        const now = Date.now();
        const isCacheValid = this.cache.data && (now - this.cache.timestamp < CACHE_TTL_MS);

        if (isCacheValid && !forceRefresh) {
            return {
                ...this.cache.data,
                cached: true,
                stale: false
            };
        }

        // Si se solicita refresco forzado o el cache expiró
        try {
            if (forceRefresh || !this.cache.data) {
                await this.syncWeeklyEnergyData();
            }
            const payload = await this.#buildConsolidatedPayload('ONLINE');
            this.cache = {
                data: payload,
                timestamp: now
            };
            return {
                ...payload,
                cached: false,
                stale: false
            };
        } catch (error) {
            console.warn('[ENERGY_SERVICE] Error refrescando fuentes oficiales, usando último dato en DB:', error.message);
            // Fallback a base de datos
            const fallbackPayload = await this.#buildConsolidatedPayload('DEGRADED');
            if (fallbackPayload && fallbackPayload.fuels.length > 0) {
                return {
                    ...fallbackPayload,
                    stale: true,
                    fallbackWarning: 'Precios vigentes del periodo anterior. Nueva resolución no disponible temporalmente.'
                };
            }
            throw error;
        }
    }

    /**
     * Sincroniza la publicación semanal oficial con la base de datos
     */
    async syncWeeklyEnergyData() {
        if (this.isSyncing) {
            console.log('[ENERGY_SERVICE] Sincronización en curso, omitiendo ejecución redundante.');
            return;
        }

        this.isSyncing = true;
        try {
            await micmFuelProvider.ensureMasterCatalog();

            // 1. Obtener la última publicación oficial desde el proveedor MICM
            const bulletinData = await micmFuelProvider.fetchLatestWeeklyBulletin();
            if (!bulletinData || !bulletinData.observations || bulletinData.observations.length === 0) {
                throw new Error('El proveedor MICM no retornó observaciones válidas.');
            }

            const { period, policy, observations } = bulletinData;

            // 2. Obtener datos de mercado internacional internos para referencias de política
            let wtiPrice = null;
            let brentPrice = null;
            let currentUsdDop = period.exchangeRate || 59.69;

            try {
                const marketData = await getMarketIntelData();
                const quotes = marketData?.quotes || [];
                wtiPrice = quotes.find(q => q.symbol === 'CL=F')?.price || null;
                brentPrice = quotes.find(q => q.symbol === 'BZ=F')?.price || null;
                if (marketData?.rates?.usd_dop) {
                    currentUsdDop = marketData.rates.usd_dop;
                }
            } catch (marketErr) {
                console.warn('[ENERGY_SERVICE] No se pudo obtener cotizaciones de mercado en tiempo real:', marketErr.message);
            }

            // 3. Persistir o actualizar la semana de política oficial
            await FuelPolicyWeek.upsert({
                id: policy.id,
                validFrom: policy.validFrom,
                validTo: policy.validTo,
                publishedAt: policy.publishedAt,
                totalSubsidyDop: policy.totalSubsidyDop,
                wtiReference: wtiPrice,
                brentReference: brentPrice,
                usdDopReference: currentUsdDop,
                governmentNotes: policy.governmentNotes,
                source: policy.source,
                sourceBulletinUrl: policy.sourceBulletinUrl,
                metadata: policy.metadata
            });

            // 4. Evaluar cada combustible, calcular cambios y guardar en DB
            const savedObservations = [];
            let increasedCount = 0;
            let decreasedCount = 0;
            let unchangedCount = 0;

            for (const obs of observations) {
                // Validación estricta de datos
                if (!obs.priceDop || obs.priceDop <= 0 || isNaN(obs.priceDop)) {
                    console.warn(`[ENERGY_SERVICE] Precio inválido para ${obs.fuelId}: ${obs.priceDop}. Omitiendo.`);
                    continue;
                }

                // Buscar observación inmediata anterior de este combustible en la base de datos
                const previousObs = await FuelPriceObservation.findOne({
                    where: {
                        fuelId: obs.fuelId,
                        validFrom: { [Op.lt]: obs.validFrom }
                    },
                    order: [['validFrom', 'DESC']]
                });

                let changeDop = 0;
                let changePercent = 0;
                let previousPrice = obs.priceDop;

                if (previousObs) {
                    previousPrice = previousObs.priceDop;
                    changeDop = Math.round((obs.priceDop - previousPrice) * 100) / 100;
                    changePercent = previousPrice !== 0 ? Math.round(((obs.priceDop - previousPrice) / previousPrice) * 10000) / 100 : 0;
                } else if (typeof obs.changeDop === 'number') {
                    changeDop = obs.changeDop;
                    previousPrice = Math.round((obs.priceDop - changeDop) * 100) / 100;
                    changePercent = previousPrice !== 0 ? Math.round((changeDop / previousPrice) * 10000) / 100 : 0;
                }

                if (changeDop > 0) increasedCount++;
                else if (changeDop < 0) decreasedCount++;
                else unchangedCount++;

                const recordToSave = {
                    ...obs,
                    previousPriceDop: previousPrice,
                    changeDop,
                    changePercent
                };

                const [savedRecord] = await FuelPriceObservation.upsert(recordToSave);
                savedObservations.push(recordToSave);
            }

            // 5. Notificaciones no invasivas vía Event Engine
            await this.#emitConsolidatedFuelEvents(period, policy, {
                total: savedObservations.length,
                increased: increasedCount,
                decreased: decreasedCount,
                unchanged: unchangedCount,
                observations: savedObservations
            });

            console.log(`[ENERGY_SERVICE] Semana ${period.validFrom} sincronizada con éxito (${savedObservations.length} combustibles).`);
            return { success: true, period, count: savedObservations.length };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Construye el evento no invasivo consolidado para el Notification Center
     */
    async #emitConsolidatedFuelEvents(period, policy, summary) {
        try {
            const idempotencyKey = `ENERGY_RD:WEEK:${period.validFrom}:${summary.total}:FUEL_PRICE_PUBLISHED`;

            const existing = await MagnusEvent.findOne({ where: { idempotencyKey } });
            if (existing) {
                return; // Ya emitido previamente
            }

            let title = `Combustibles RD: Semana ${period.validFrom.split('-')[2]}-${period.validTo.split('-')[2]} Oct`;
            let message = '';
            let severity = 'INFO';

            if (summary.increased > 0 && summary.decreased > 0) {
                message = `MICM actualizó combustibles: ${summary.increased} subieron, ${summary.decreased} bajaron y ${summary.unchanged} sin cambios.`;
                severity = 'WATCH';
            } else if (summary.increased > 0) {
                message = `MICM actualizó combustibles: ${summary.increased} subieron y ${summary.unchanged} permanecen sin cambios.`;
                severity = summary.observations.some(o => o.changeDop >= 5) ? 'IMPORTANT' : 'WATCH';
            } else if (summary.decreased > 0) {
                message = `MICM actualizó combustibles: ${summary.decreased} registraron rebajas y ${summary.unchanged} sin cambios.`;
                severity = 'INFO';
            } else {
                const subsidyText = policy.totalSubsidyDop 
                    ? ` mediante subsidio de RD$ ${(policy.totalSubsidyDop / 1e6).toFixed(1)} MM`
                    : '';
                message = `Gobierno mantiene congelados los precios de los principales combustibles${subsidyText}.`;
                severity = 'INFO';
            }

            const eventRecord = await MagnusEvent.create({
                eventType: 'FUEL_PRICE_PUBLISHED',
                domain: 'ENERGY_RD',
                indicatorId: 'FUEL_WEEK_ALL',
                title,
                message,
                severity,
                referencePeriod: `${period.validFrom} al ${period.validTo}`,
                valueBefore: null,
                valueAfter: policy.totalSubsidyDop || 0,
                delta: 0,
                unit: 'RD$',
                idempotencyKey,
                metadata: {
                    validFrom: period.validFrom,
                    validTo: period.validTo,
                    totalSubsidyDop: policy.totalSubsidyDop,
                    summary
                }
            });

            await MagnusNotification.create({
                eventId: eventRecord.id,
                userId: null, // Broadcast a toda la plataforma
                title,
                message,
                severity,
                isRead: false,
                linkUrl: '/finanza/mercado',
                metadata: {
                    domain: 'ENERGY_RD',
                    validFrom: period.validFrom,
                    validTo: period.validTo
                }
            });

            console.log(`[ENERGY_SERVICE][EVENT] ${title} | ${message}`);
        } catch (err) {
            console.error('[ENERGY_SERVICE] Error al emitir evento de combustibles:', err.message);
        }
    }

    /**
     * Construye el payload completo consolidado para la UI de Mercado
     */
    async #buildConsolidatedPayload(sourceStatus = 'ONLINE') {
        const catalogs = await FuelCatalog.findAll({
            where: { isActive: true },
            order: [['priorityOrder', 'ASC']]
        });

        // Buscar el último periodo de vigencia registrado
        const latestObs = await FuelPriceObservation.findOne({
            order: [['validFrom', 'DESC']]
        });

        if (!latestObs) {
            return {
                status: 'EMPTY',
                fuels: [],
                policy: null,
                marketContext: null,
                meta: { source: 'MICM', isHealthy: false }
            };
        }

        const currentValidFrom = latestObs.validFrom;
        const currentValidTo = latestObs.validTo;

        // Cargar observaciones del periodo vigente
        const currentObservations = await FuelPriceObservation.findAll({
            where: { validFrom: currentValidFrom }
        });

        const fuels = catalogs.map(cat => {
            const obs = currentObservations.find(o => o.fuelId === cat.id);
            return {
                id: cat.id,
                name: cat.name,
                shortName: cat.shortName,
                category: cat.category,
                unit: cat.unit,
                priorityOrder: cat.priorityOrder,
                description: cat.description,
                price: obs ? obs.priceDop : 0,
                previousPrice: obs ? obs.previousPriceDop : 0,
                change: obs ? obs.changeDop : 0,
                changePercent: obs ? obs.changePercent : 0,
                subsidyPerUnit: obs ? obs.subsidyPerUnit : null,
                validFrom: obs ? obs.validFrom : currentValidFrom,
                validTo: obs ? obs.validTo : currentValidTo,
                breakdown: obs ? {
                    importParityPrice: obs.importParityPrice,
                    taxLey11200: obs.taxLey11200,
                    taxLey49506: obs.taxLey49506,
                    distributionMargin: obs.distributionMargin,
                    retailMargin: obs.retailMargin,
                    transportFee: obs.transportFee,
                    exchangeRateReference: obs.exchangeRateReference
                } : null
            };
        });

        // Cargar política y subsidio de la semana
        const policyRecord = await FuelPolicyWeek.findOne({
            where: { validFrom: currentValidFrom }
        });

        // Conexión con Mercado Global (WTI, Brent, USD/DOP)
        let marketContext = {
            wti: { price: 91.11, changePercent: -1.90, unit: 'USD/bbl' },
            brent: { price: 94.45, changePercent: -1.50, unit: 'USD/bbl' },
            usdDop: { price: 59.69, changePercent: 0.15, unit: 'RD$' }
        };

        try {
            const marketData = await getMarketIntelData();
            const quotes = marketData?.quotes || [];
            const wti = quotes.find(q => q.symbol === 'CL=F');
            const brent = quotes.find(q => q.symbol === 'BZ=F');
            const usdDop = quotes.find(q => q.symbol === 'DOP=X');

            if (wti) {
                marketContext.wti = {
                    price: wti.price,
                    prevClose: wti.prev_close,
                    changePercent: wti.change_percent,
                    unit: 'USD/bbl'
                };
            }
            if (brent) {
                marketContext.brent = {
                    price: brent.price,
                    prevClose: brent.prev_close,
                    changePercent: brent.change_percent,
                    unit: 'USD/bbl'
                };
            }
            if (usdDop) {
                marketContext.usdDop = {
                    price: usdDop.price,
                    changePercent: usdDop.change_percent,
                    unit: 'RD$'
                };
            }
        } catch (e) {
            // Mantener valores de mercado seguros
        }

        // =========================================================================
        // MÉTRICA DERIVADA ANALÍTICA // MAGNUS ENERGY PRESSURE
        // =========================================================================
        const wtiDelta = marketContext.wti.changePercent || 0;
        const fxDelta = marketContext.usdDop.changePercent || 0;
        // Fórmula documentada: 65% Crudo + 35% Devaluación cambiaria
        const pressureScore = Math.round((wtiDelta * 0.65 + fxDelta * 0.35) * 100) / 100;
        
        let pressureLabel = 'ESTABLE';
        let pressureInsight = 'Precios internacionales y tipo de cambio en rango de equilibrio.';
        
        if (pressureScore > 1.5) {
            pressureLabel = 'ALTA PRESIÓN ALCISTA';
            pressureInsight = policyRecord?.totalSubsidyDop
                ? `La estabilidad local coincide con mayor absorción estatal vía subsidios (RD$ ${(policyRecord.totalSubsidyDop / 1e6).toFixed(1)} MM).`
                : 'Presión alcista por encarecimiento del crudo internacional y divisa.';
        } else if (pressureScore < -1.5) {
            pressureLabel = 'PRESIÓN A LA BAJA';
            pressureInsight = 'La moderación en cotizaciones internacionales de crudo reduce la necesidad de transferencias fiscales extraordinarias.';
        }

        const energyPressure = {
            status: pressureLabel,
            score: pressureScore,
            insight: pressureInsight,
            formula: '0.65 × Δ% WTI (30d) + 0.35 × Δ% USD/DOP (30d)',
            type: 'MAGNUS DERIVED',
            source: 'MAGNUS CAPITAL'
        };

        const lastHealth = await FuelSourceHealth.findOne({
            order: [['timestamp', 'DESC']]
        });

        return {
            status: sourceStatus,
            module: 'Energía RD // Combustibles',
            subtitle: 'Combustibles y mercado energético dominicano',
            period: {
                validFrom: currentValidFrom,
                validTo: currentValidTo,
                publishedAt: latestObs.publishedAt,
                isCurrent: new Date() <= new Date(`${currentValidTo}T23:59:59Z`)
            },
            policy: policyRecord ? {
                totalSubsidyDop: policyRecord.totalSubsidyDop,
                formattedSubsidy: policyRecord.totalSubsidyDop ? `RD$ ${(policyRecord.totalSubsidyDop / 1e6).toFixed(1)} MM` : null,
                notes: policyRecord.governmentNotes,
                wtiReference: policyRecord.wtiReference,
                brentReference: policyRecord.brentReference,
                usdDopReference: policyRecord.usdDopReference,
                source: policyRecord.source
            } : null,
            marketContext,
            energyPressure,
            fuels,
            meta: {
                source: 'MICM',
                sourceName: 'Ministerio de Industria, Comercio y Mipymes',
                isHealthy: lastHealth ? lastHealth.success : true,
                latencyMs: lastHealth ? lastHealth.latencyMs : null,
                lastChecked: lastHealth ? lastHealth.timestamp : new Date().toISOString()
            }
        };
    }

    /**
     * Obtiene el histórico semanal y datos de comparación para un combustible
     */
    async getFuelHistory(fuelId, range = '1Y') {
        const catalog = await FuelCatalog.findByPk(fuelId);
        if (!catalog) return null;

        let dateLimit = new Date();
        if (range === '1M') dateLimit.setMonth(dateLimit.getMonth() - 1);
        else if (range === '3M') dateLimit.setMonth(dateLimit.getMonth() - 3);
        else if (range === '6M') dateLimit.setMonth(dateLimit.getMonth() - 6);
        else if (range === '1Y') dateLimit.setFullYear(dateLimit.getFullYear() - 1);
        else if (range === '3Y') dateLimit.setFullYear(dateLimit.getFullYear() - 3);
        else dateLimit = new Date(0); // ALL

        const dateLimitStr = dateLimit.toISOString().split('T')[0];

        const observations = await FuelPriceObservation.findAll({
            where: {
                fuelId,
                validFrom: { [Op.gte]: dateLimitStr }
            },
            order: [['validFrom', 'ASC']]
        });

        // Si hay pocas observaciones, intentar sembrar el histórico si la base está vacía
        if (observations.length <= 1) {
            try {
                await micmFuelProvider.ingestHistoricalCsv();
            } catch (e) {}
        }

        const series = observations.map(o => ({
            id: o.id,
            date: o.validFrom,
            validFrom: o.validFrom,
            validTo: o.validTo,
            period: `${o.validFrom.split('-')[2]}/${o.validFrom.split('-')[1]}`,
            fullPeriod: `${o.validFrom} al ${o.validTo}`,
            price: o.priceDop,
            previousPrice: o.previousPriceDop,
            change: o.changeDop,
            changePercent: o.changePercent,
            subsidy: o.subsidyPerUnit,
            unit: o.unit
        }));

        // Construir serie de contexto normalizado Base 100
        const basePrice = series.length > 0 ? series[0].price : 1;
        const normalizedSeries = series.map(pt => ({
            ...pt,
            normalizedPrice: basePrice > 0 ? Math.round((pt.price / basePrice) * 10000) / 100 : 100
        }));

        return {
            fuel: catalog,
            range,
            count: series.length,
            series,
            normalizedSeries
        };
    }
}

export const energyService = new EnergyService();
