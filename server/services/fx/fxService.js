/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // ORCHESTRATOR
 * Cache SWR, Anti-Stampede Single-Flight, Cascade Fallbacks & Evaluation Engine
 * ============================================================================
 */

import { TasaRealProvider } from './providers/tasaRealProvider.js';
import { InfoDolarProvider } from './providers/infoDolarProvider.js';
import { BcrdProvider } from './providers/bcrdProvider.js';
import { YahooProvider } from './providers/yahooProvider.js';
import { validateAndConsolidateRates } from './validator.js';
import { FxRateObservation, FxProviderHealth } from '../../models/index.js';
import { Op } from 'sequelize';

export class FxService {
    constructor() {
        this.tasaReal = new TasaRealProvider();
        this.infoDolar = new InfoDolarProvider();
        this.bcrd = new BcrdProvider();
        this.yahoo = new YahooProvider();

        // Configuración de caché
        const ttlMinutes = parseInt(process.env.FX_CACHE_TTL_MINUTES || '60', 10);
        this.cacheTtlMs = ttlMinutes * 60 * 1000;
        this.maxStaleHours = parseInt(process.env.FX_MAX_STALE_HOURS || '24', 10);

        // Estado en memoria aislado por par (ej: 'USD/DOP', 'EUR/DOP')
        this.cache = new Map();

        // Anti-Stampede aislado por par (Single-flight Promise lock per pair)
        this.activeRefreshPromises = new Map();
    }

    /**
     * Normaliza el identificador de par de divisas (soporta 'USD/DOP', 'EUR/DOP', 'usd-dop', etc.)
     */
    #normalizePair(pairInput = 'USD/DOP') {
        if (!pairInput || typeof pairInput !== 'string') return 'USD/DOP';
        const cleaned = pairInput.replace(/[-_]/g, '/').toUpperCase();
        if (cleaned.startsWith('EUR') || cleaned === 'EUR/DOP') return 'EUR/DOP';
        return 'USD/DOP';
    }

    /**
     * Retorna el estado consolidado de divisas implementando Stale-While-Revalidate y Single-Flight por par
     * @param {string} pairInput - 'USD/DOP' o 'EUR/DOP'
     * @param {Object} options
     * @param {boolean} options.forceRefresh - Fuerza llamada externa inmediata
     */
    async getRates(pairInput = 'USD/DOP', { forceRefresh = false } = {}) {
        const pair = this.#normalizePair(pairInput);
        const [baseCurrency, quoteCurrency] = pair.split('/');
        const now = Date.now();

        const cached = this.cache.get(pair);
        const hasCache = Boolean(cached && cached.data);
        const cacheAgeMs = hasCache ? (now - cached.timestamp) : Infinity;
        const isFresh = hasCache && cacheAgeMs < this.cacheTtlMs;

        // Caso 1: Caché fresca en memoria -> respuesta inmediata en 0ms
        if (isFresh && !forceRefresh) {
            return {
                ...cached.data,
                meta: {
                    ...cached.data.meta,
                    cache: true,
                    stale: false,
                    ageMinutes: Math.floor(cacheAgeMs / 60000)
                }
            };
        }

        // Caso 2: Forzar refresco explícito
        if (forceRefresh) {
            return this.#executeSingleFlightRefresh(pair);
        }

        // Caso 3: Caché expirada pero presente -> SWR: entregar dato viejo y refrescar en background
        if (hasCache) {
            const ageMinutes = Math.floor(cacheAgeMs / 60000);
            const isMaxStale = ageMinutes > (this.maxStaleHours * 60);

            // Disparar refresco en segundo plano si no hay uno en curso para este par
            this.#executeSingleFlightRefresh(pair).catch(err => {
                console.warn(`[FX][${pair}] Error en refresco SWR en segundo plano:`, err.message);
            });

            return {
                ...cached.data,
                meta: {
                    ...cached.data.meta,
                    cache: true,
                    stale: true,
                    ageMinutes,
                    isMaxStale,
                    warning: isMaxStale ? `⚠ Última tasa ${pair} disponible (>24h). Esperando actualización bancaria.` : undefined
                }
            };
        }

        // Caso 4: No hay caché en memoria (primer arranque) -> intentar cargar de base de datos
        const dbSnapshot = await this.#loadLastSnapshotFromDb(baseCurrency, quoteCurrency);
        if (dbSnapshot) {
            this.cache.set(pair, {
                data: dbSnapshot,
                timestamp: new Date(dbSnapshot.generatedAt).getTime()
            });

            // Disparar refresco en background
            this.#executeSingleFlightRefresh(pair).catch(err => {
                console.warn(`[FX][${pair}] Error en refresco inicial en background:`, err.message);
            });

            const initialAge = Math.floor((now - new Date(dbSnapshot.generatedAt).getTime()) / 60000);
            return {
                ...dbSnapshot,
                meta: {
                    ...dbSnapshot.meta,
                    cache: true,
                    stale: initialAge > 60,
                    ageMinutes: initialAge,
                    recoveredFromDb: true
                }
            };
        }

        // Caso 5: No hay datos en memoria ni en BD -> llamada síncrona protegida
        return this.#executeSingleFlightRefresh(pair);
    }

    /**
     * Interfaz retrocompatible para USD/DOP
     */
    async getUsdDopRates(options = {}) {
        return this.getRates('USD/DOP', options);
    }

    /**
     * Interfaz dedicada para EUR/DOP
     */
    async getEurDopRates(options = {}) {
        return this.getRates('EUR/DOP', options);
    }

    /**
     * Single-Flight Mutex: Las peticiones concurrentes del mismo par comparten la misma promesa en vuelo
     */
    async #executeSingleFlightRefresh(pair) {
        if (this.activeRefreshPromises.has(pair)) {
            return this.activeRefreshPromises.get(pair);
        }

        const refreshPromise = (async () => {
            try {
                const refreshed = await this.#refreshAllProviders(pair);
                this.cache.set(pair, {
                    data: refreshed,
                    timestamp: Date.now()
                });
                return refreshed;
            } finally {
                this.activeRefreshPromises.delete(pair);
            }
        })();

        this.activeRefreshPromises.set(pair, refreshPromise);
        return refreshPromise;
    }

    /**
     * Ejecuta la consulta paralela a los proveedores activos para el par indicado
     */
    async #refreshAllProviders(pair) {
        const startTime = Date.now();
        const [baseCurrency, quoteCurrency] = pair.split('/');

        // Despacho concurrente de todos los providers parametrizados por moneda
        const [tasaRealRes, infoDolarRes, bcrdRes, yahooRes] = await Promise.allSettled([
            this.tasaReal.getRates(baseCurrency),
            this.infoDolar.getRates(baseCurrency),
            this.bcrd.getRates(baseCurrency),
            this.yahoo.getRates(baseCurrency)
        ]);

        const providerErrors = [];
        const activeProviders = [];
        let allObservations = [];

        // Telemetría TasaReal
        if (tasaRealRes.status === 'fulfilled' && tasaRealRes.value.success) {
            activeProviders.push('tasareal');
            allObservations = allObservations.concat(tasaRealRes.value.data || []);
            await this.#recordHealth('tasareal', true, tasaRealRes.value.latencyMs, tasaRealRes.value.recordsReceived, null, tasaRealRes.value.retryCount, baseCurrency);
        } else {
            const err = tasaRealRes.status === 'rejected' ? tasaRealRes.reason.message : (tasaRealRes.value?.error || 'Falló');
            providerErrors.push({ provider: 'tasareal', error: err });
            await this.#recordHealth('tasareal', false, 0, 0, err, 0, baseCurrency);
        }

        // Telemetría InfoDolar
        if (infoDolarRes.status === 'fulfilled' && infoDolarRes.value.success) {
            activeProviders.push('infodolar');
            allObservations = allObservations.concat(infoDolarRes.value.data || []);
            await this.#recordHealth('infodolar', true, infoDolarRes.value.latencyMs, infoDolarRes.value.recordsReceived, null, infoDolarRes.value.retryCount, baseCurrency);
        } else {
            const err = infoDolarRes.status === 'rejected' ? infoDolarRes.reason.message : (infoDolarRes.value?.error || 'Falló');
            providerErrors.push({ provider: 'infodolar', error: err });
            await this.#recordHealth('infodolar', false, 0, 0, err, 0, baseCurrency);
        }

        // Referencia Oficial BCRD
        let officialRef = null;
        if (bcrdRes.status === 'fulfilled' && bcrdRes.value.success && bcrdRes.value.data?.[0]) {
            const b = bcrdRes.value.data[0];
            officialRef = {
                buy: b.buy,
                sell: b.sell,
                observedAt: b.observedAt,
                provider: 'bcrd'
            };
        } else {
            // Fallback: Si el provider BCRD falló, buscar si TasaReal trajo la tasa oficial del Banco Central
            const officialObs = allObservations.find(o => o.rateType === 'OFFICIAL_REFERENCE' || o.institutionId === 'bcrd');
            if (officialObs) {
                officialRef = {
                    buy: officialObs.buy,
                    sell: officialObs.sell,
                    observedAt: officialObs.observedAt,
                    provider: 'bcrd'
                };
            }
        }

        // Referencia de Mercado (Yahoo Finance)
        let marketRef = null;
        let eurUsdBenchmark = null;

        if (yahooRes.status === 'fulfilled' && yahooRes.value.success && yahooRes.value.data?.[0]) {
            const y = yahooRes.value.data[0];
            marketRef = {
                price: y.buy,
                prevClose: y.metadata?.prevClose || y.buy,
                change: y.metadata?.change || 0,
                changePercent: y.metadata?.changePercent || 0,
                observedAt: y.observedAt,
                provider: 'yahoo',
                ticker: y.metadata?.ticker || (baseCurrency === 'EUR' ? 'EURDOP=X' : 'DOP=X')
            };

            if (y.metadata?.eurUsd) {
                eurUsdBenchmark = y.metadata.eurUsd;
            }
        }

        // Cálculo analítico triangular para EUR: EUR/USD x USD/DOP = EUR/DOP implícito
        let impliedRef = null;
        if (baseCurrency === 'EUR') {
            const usdSnapshot = this.cache.get('USD/DOP')?.data;
            const usdDopRate = usdSnapshot?.summary?.avgSell || usdSnapshot?.reference?.market?.price || 60.15;
            const eurUsdRate = eurUsdBenchmark?.price || (marketRef?.price ? marketRef.price / usdDopRate : 1.085);
            const impliedRate = Math.round(eurUsdRate * usdDopRate * 100) / 100;

            impliedRef = {
                rate: impliedRate,
                formula: 'EUR/USD × USD/DOP',
                eurUsd: eurUsdRate,
                usdDop: usdDopRate,
                label: 'DERIVADO / BENCHMARK',
                description: 'Tasa teórica implícita internacional (no es cotización bancaria local)'
            };
        }

        // Si ningún agregador bancario respondió, intentar fallback a la caché existente o BD
        const currentCached = this.cache.get(pair)?.data;
        if (allObservations.length === 0) {
            console.warn(`[FX][${pair}] Ningún proveedor bancario devolvió datos frescos. Activando cascada de fallback.`);
            if (currentCached) {
                return {
                    ...currentCached,
                    meta: {
                        ...currentCached.meta,
                        stale: true,
                        degraded: true,
                        providerErrors
                    }
                };
            }
            const dbFallback = await this.#loadLastSnapshotFromDb(baseCurrency, quoteCurrency);
            if (dbFallback) {
                return {
                    ...dbFallback,
                    meta: {
                        ...dbFallback.meta,
                        stale: true,
                        degraded: true,
                        providerErrors
                    }
                };
            }
        }

        // Validar y consolidar tasas bancarias minoristas
        const consolidatedBanks = validateAndConsolidateRates(allObservations);

        // Calcular promedios del mercado bancario
        const validBuys = consolidatedBanks.map(b => b.buy).filter(v => v !== null && v > 0);
        const validSells = consolidatedBanks.map(b => b.sell).filter(v => v !== null && v > 0);

        const avgBuy = validBuys.length ? Math.round((validBuys.reduce((a, b) => a + b, 0) / validBuys.length) * 100) / 100 : null;
        const avgSell = validSells.length ? Math.round((validSells.reduce((a, b) => a + b, 0) / validSells.length) * 100) / 100 : null;
        const avgSpread = (avgBuy !== null && avgSell !== null) ? Math.round((avgSell - avgBuy) * 100) / 100 : null;

        // Calcular mejores tasas (excluyendo valores en conflicto severo)
        const eligibleBanks = consolidatedBanks.filter(b => b.validationStatus !== 'CONFLICT');
        
        let bestToSell = null; // Mayor compra (cliente vende moneda al banco)
        let bestToBuy = null;  // Menor venta (cliente compra moneda al banco)

        if (eligibleBanks.length) {
            const sortedByBuy = [...eligibleBanks].filter(b => b.buy).sort((a, b) => b.buy - a.buy);
            const sortedBySell = [...eligibleBanks].filter(b => b.sell).sort((a, b) => a.sell - b.sell);

            if (sortedByBuy.length) {
                bestToSell = {
                    institutionId: sortedByBuy[0].institutionId,
                    institutionName: sortedByBuy[0].institutionName,
                    rate: sortedByBuy[0].buy,
                    validationStatus: sortedByBuy[0].validationStatus
                };
            }

            if (sortedBySell.length) {
                bestToBuy = {
                    institutionId: sortedBySell[0].institutionId,
                    institutionName: sortedBySell[0].institutionName,
                    rate: sortedBySell[0].sell,
                    validationStatus: sortedBySell[0].validationStatus
                };
            }
        }

        const nowIso = new Date().toISOString();

        const payload = {
            pair,
            baseCurrency,
            quoteCurrency,
            generatedAt: nowIso,
            summary: {
                avgBuy,
                avgSell,
                averageBuy: avgBuy,
                averageSell: avgSell,
                avgSpread,
                institutionsCount: consolidatedBanks.length,
                bestToSell,
                bestToBuy,
                // Retrocompatibilidad con nombres específicos USD
                bestToSellUsd: bestToSell,
                bestToBuyUsd: bestToBuy
            },
            bestRates: {
                bestToSell,
                bestToBuy,
                bestToSellUsd: bestToSell,
                bestToBuyUsd: bestToBuy
            },
            reference: {
                market: marketRef || currentCached?.reference?.market || null,
                official: officialRef || currentCached?.reference?.official || null,
                eurUsd: eurUsdBenchmark || currentCached?.reference?.eurUsd || null,
                implied: impliedRef || currentCached?.reference?.implied || null
            },
            banks: consolidatedBanks,
            meta: {
                cache: false,
                stale: false,
                ageMinutes: 0,
                durationMs: Date.now() - startTime,
                activeProviders,
                providerErrors,
                sources: [
                    { id: 'tasareal', name: 'TasaReal', status: activeProviders.includes('tasareal') ? 'ONLINE' : (this.tasaReal.enabled ? 'DEGRADED' : 'OFFLINE') },
                    { id: 'infodolar', name: 'InfoDolar RD', status: activeProviders.includes('infodolar') ? 'ONLINE' : 'DEGRADED' },
                    { id: 'bcrd', name: 'Banco Central RD', status: officialRef ? 'ONLINE' : 'DEGRADED' },
                    { id: 'yahoo', name: 'Yahoo Finance', status: marketRef ? 'ONLINE' : 'DEGRADED' }
                ]
            }
        };

        // Persistir en PostgreSQL/SQLite con base_currency de manera asíncrona
        this.#persistObservationsToDb(consolidatedBanks, baseCurrency, quoteCurrency).catch(err => {
            console.error(`[FX][${pair}] Error persistiendo observaciones en BD:`, err.message);
        });

        return payload;
    }

    /**
     * Persistencia deduplicada en PostgreSQL/SQLite diferenciada por base_currency
     */
    async #persistObservationsToDb(banks, baseCurrency = 'USD', quoteCurrency = 'DOP') {
        if (!banks || !banks.length) return;
        const today = new Date().toISOString().split('T')[0];

        for (const bank of banks) {
            try {
                // Buscar la última observación registrada para esta institución Y esta moneda base
                const lastObs = await FxRateObservation.findOne({
                    where: {
                        institutionId: bank.institutionId,
                        baseCurrency
                    },
                    order: [['observed_at', 'DESC'], ['id', 'DESC']]
                });

                let shouldInsert = false;

                if (!lastObs) {
                    shouldInsert = true;
                } else {
                    const lastDate = new Date(lastObs.observedAt).toISOString().split('T')[0];
                    const diffBuy = Math.abs((lastObs.buy || 0) - (bank.buy || 0));
                    const diffSell = Math.abs((lastObs.sell || 0) - (bank.sell || 0));

                    // Insertar si cambió de día o si hubo variación de precio >= 0.01 DOP
                    if (lastDate !== today || diffBuy >= 0.01 || diffSell >= 0.01 || lastObs.validationStatus !== bank.validationStatus) {
                        shouldInsert = true;
                    }
                }

                if (shouldInsert) {
                    await FxRateObservation.create({
                        observedAt: bank.observedAt || new Date(),
                        provider: bank.providers?.[0] || 'consolidated',
                        institutionId: bank.institutionId,
                        institutionName: bank.institutionName,
                        rateType: bank.rateType,
                        baseCurrency,
                        quoteCurrency,
                        buy: bank.buy,
                        sell: bank.sell,
                        mid: bank.mid,
                        spread: bank.spread,
                        confidence: bank.confidence,
                        validationStatus: bank.validationStatus,
                        providerUpdatedAt: bank.providerUpdatedAt
                    });
                }
            } catch (err) {
                // Silencioso por institución individual para no interrumpir el lote
            }
        }
    }

    /**
     * Carga el último estado válido completo desde la base de datos para una moneda específica
     */
    async #loadLastSnapshotFromDb(baseCurrency = 'USD', quoteCurrency = 'DOP') {
        try {
            const pair = `${baseCurrency}/${quoteCurrency}`;
            const latestRecords = await FxRateObservation.findAll({
                where: { baseCurrency },
                order: [['observed_at', 'DESC'], ['id', 'DESC']],
                limit: 50
            });

            if (!latestRecords || latestRecords.length === 0) return null;

            const map = new Map();
            for (const r of latestRecords) {
                if (!map.has(r.institutionId)) {
                    map.set(r.institutionId, {
                        institutionId: r.institutionId,
                        institutionName: r.institutionName,
                        rateType: r.rateType,
                        buy: r.buy,
                        sell: r.sell,
                        mid: r.mid,
                        spread: r.spread,
                        confidence: r.confidence,
                        validationStatus: r.validationStatus,
                        observedAt: r.observedAt,
                        providers: [r.provider]
                    });
                }
            }

            const banks = Array.from(map.values());
            const validBuys = banks.map(b => b.buy).filter(v => v !== null && v > 0);
            const validSells = banks.map(b => b.sell).filter(v => v !== null && v > 0);
            const avgBuy = validBuys.length ? Math.round((validBuys.reduce((a, b) => a + b, 0) / validBuys.length) * 100) / 100 : null;
            const avgSell = validSells.length ? Math.round((validSells.reduce((a, b) => a + b, 0) / validSells.length) * 100) / 100 : null;
            const avgSpread = (avgBuy && avgSell) ? Math.round((avgSell - avgBuy) * 100) / 100 : null;

            const sortedByBuy = [...banks].filter(b => b.buy).sort((a, b) => b.buy - a.buy);
            const sortedBySell = [...banks].filter(b => b.sell).sort((a, b) => a.sell - b.sell);
            const bestToSell = sortedByBuy.length ? {
                institutionId: sortedByBuy[0].institutionId,
                institutionName: sortedByBuy[0].institutionName,
                rate: sortedByBuy[0].buy,
                validationStatus: sortedByBuy[0].validationStatus
            } : null;
            const bestToBuy = sortedBySell.length ? {
                institutionId: sortedBySell[0].institutionId,
                institutionName: sortedBySell[0].institutionName,
                rate: sortedBySell[0].sell,
                validationStatus: sortedBySell[0].validationStatus
            } : null;

            return {
                pair,
                baseCurrency,
                quoteCurrency,
                generatedAt: latestRecords[0].observedAt,
                summary: {
                    avgBuy,
                    avgSell,
                    avgSpread,
                    institutionsCount: banks.length,
                    bestToSell,
                    bestToBuy,
                    bestToSellUsd: bestToSell,
                    bestToBuyUsd: bestToBuy
                },
                bestRates: {
                    bestToSell,
                    bestToBuy,
                    bestToSellUsd: bestToSell,
                    bestToBuyUsd: bestToBuy
                },
                reference: {
                    market: null,
                    official: null,
                    eurUsd: null,
                    implied: null
                },
                banks,
                meta: {
                    cache: true,
                    stale: true,
                    fromDb: true
                }
            };
        } catch (error) {
            console.error(`[FX][${baseCurrency}/DOP] No se pudo cargar snapshot desde BD:`, error.message);
            return null;
        }
    }

    /**
     * Registra evento de salud y latencia de un proveedor en FxProviderHealth
     */
    async #recordHealth(provider, success, latencyMs, recordsReceived, errorType, retryCount, currency = 'USD') {
        try {
            await FxProviderHealth.create({
                provider: `${provider}:${currency}`,
                timestamp: new Date(),
                success,
                latencyMs: latencyMs || 0,
                recordsReceived: recordsReceived || 0,
                errorType: errorType ? String(errorType).slice(0, 250) : null,
                retryCount: retryCount || 0,
                circuitState: provider === 'tasareal' ? this.tasaReal.circuitState : (provider === 'infodolar' ? this.infoDolar.circuitState : 'CLOSED')
            });
        } catch (err) {
            // Ignorar fallos de logging de telemetría para no tumbar el flujo principal
        }
    }

    /**
     * Retorna la serie histórica de una institución o del mercado general filtrando por moneda
     */
    async getHistory(institutionId, days = 30, baseCurrency = 'USD') {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);
        const base = (baseCurrency || 'USD').toUpperCase();

        const where = {
            observedAt: { [Op.gte]: sinceDate },
            baseCurrency: base
        };

        if (institutionId && institutionId !== 'general') {
            where.institutionId = institutionId;
        }

        const rows = await FxRateObservation.findAll({
            where,
            order: [['observed_at', 'ASC']],
            limit: 1000
        });

        return rows.map(r => ({
            id: r.id,
            institutionId: r.institutionId,
            institutionName: r.institutionName,
            baseCurrency: r.baseCurrency,
            quoteCurrency: r.quoteCurrency,
            buy: r.buy,
            sell: r.sell,
            mid: r.mid,
            spread: r.spread,
            timestamp: r.observedAt,
            provider: r.provider,
            validationStatus: r.validationStatus
        }));
    }

    /**
     * Genera el Reporte de Evaluación para el trial de 29 días de TasaReal
     */
    async getTasaRealEvaluation(days = 29, currency = null) {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const providerFilter = currency ? `tasareal:${currency.toUpperCase()}` : { [Op.like]: 'tasareal%' };

        const healthLogs = await FxProviderHealth.findAll({
            where: {
                provider: providerFilter,
                timestamp: { [Op.gte]: sinceDate }
            },
            order: [['timestamp', 'ASC']]
        });

        const totalRequests = healthLogs.length;
        const successful = healthLogs.filter(h => h.success).length;
        const failed = totalRequests - successful;
        const availability = totalRequests > 0 ? Math.round((successful / totalRequests) * 10000) / 100 : 100;

        const latencies = healthLogs.filter(h => h.success && h.latencyMs > 0).map(h => h.latencyMs);
        latencies.sort((a, b) => a - b);

        const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
        const p95Latency = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;

        // Auditoría de discrepancias vs InfoDolar
        const obsWhere = {
            observedAt: { [Op.gte]: sinceDate }
        };
        if (currency) {
            obsWhere.baseCurrency = currency.toUpperCase();
        }

        const comparisons = await FxRateObservation.findAll({
            where: obsWhere,
            limit: 500
        });

        const verifiedCount = comparisons.filter(c => c.validationStatus === 'VERIFIED').length;
        const agreementRate = comparisons.length > 0 ? Math.round((verifiedCount / comparisons.length) * 10000) / 100 : 100;

        return {
            periodDays: days,
            currency: currency || 'ALL',
            configured: Boolean(process.env.TASAREAL_API_KEY),
            enabled: this.tasaReal.enabled,
            circuitState: this.tasaReal.circuitState,
            metrics: {
                availabilityPercent: availability,
                successfulRequests: successful,
                failedRequests: failed,
                totalRequests,
                averageLatencyMs: avgLatency,
                p95LatencyMs: p95Latency,
                agreementPercentage: agreementRate,
                lastChecked: this.tasaReal.lastChecked
            },
            recommendation: availability >= 95 ? 'TASAREAL PRIMARY' : (availability >= 80 ? 'TASAREAL SECONDARY' : 'TASAREAL FALLBACK')
        };
    }
}

// Singleton global
export const fxService = new FxService();

