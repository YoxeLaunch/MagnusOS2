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

        // Estado en memoria
        this.cacheData = null;
        this.cacheTimestamp = 0;

        // Anti-Stampede (Single-flight Promise lock)
        this.activeRefreshPromise = null;
    }

    /**
     * Retorna el estado consolidado de divisas USD/DOP implementando Stale-While-Revalidate y Single-Flight
     */
    async getUsdDopRates({ forceRefresh = false } = {}) {
        const now = Date.now();
        const hasCache = this.cacheData !== null;
        const cacheAgeMs = now - this.cacheTimestamp;
        const isFresh = hasCache && cacheAgeMs < this.cacheTtlMs;

        // Caso 1: Caché fresca en memoria -> respuesta inmediata en 0ms
        if (isFresh && !forceRefresh) {
            return {
                ...this.cacheData,
                meta: {
                    ...this.cacheData.meta,
                    cache: true,
                    stale: false,
                    ageMinutes: Math.floor(cacheAgeMs / 60000)
                }
            };
        }

        // Caso 2: Forzar refresco explícito (ej. admin o botón de recarga)
        if (forceRefresh) {
            return this.#executeSingleFlightRefresh();
        }

        // Caso 3: Caché expirada pero presente -> SWR: responder inmediatamente el dato viejo y refrescar en background
        if (hasCache) {
            const ageMinutes = Math.floor(cacheAgeMs / 60000);
            const isMaxStale = ageMinutes > (this.maxStaleHours * 60);

            // Disparar refresco en segundo plano si no hay uno en curso
            this.#executeSingleFlightRefresh().catch(err => {
                console.warn('[FX] Error en refresco SWR en segundo plano:', err.message);
            });

            return {
                ...this.cacheData,
                meta: {
                    ...this.cacheData.meta,
                    cache: true,
                    stale: true,
                    ageMinutes,
                    isMaxStale,
                    warning: isMaxStale ? '⚠ Última tasa disponible (>24h). Esperando actualización bancaria.' : undefined
                }
            };
        }

        // Caso 4: No hay caché en memoria (primer arranque) -> intentar cargar de PostgreSQL primero o refrescar
        const dbSnapshot = await this.#loadLastSnapshotFromDb();
        if (dbSnapshot) {
            this.cacheData = dbSnapshot;
            this.cacheTimestamp = new Date(dbSnapshot.generatedAt).getTime();
            
            // Disparar refresco para actualizar datos en background
            this.#executeSingleFlightRefresh().catch(err => {
                console.warn('[FX] Error en refresco inicial en background:', err.message);
            });

            const initialAge = Math.floor((now - this.cacheTimestamp) / 60000);
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
        return this.#executeSingleFlightRefresh();
    }

    /**
     * Single-Flight: Si múltiples peticiones concurrentes piden refrescar, comparten la misma promesa
     */
    async #executeSingleFlightRefresh() {
        if (this.activeRefreshPromise) {
            return this.activeRefreshPromise;
        }

        this.activeRefreshPromise = (async () => {
            try {
                const refreshed = await this.#refreshAllProviders();
                this.cacheData = refreshed;
                this.cacheTimestamp = Date.now();
                return refreshed;
            } finally {
                this.activeRefreshPromise = null;
            }
        })();

        return this.activeRefreshPromise;
    }

    /**
     * Ejecuta la consulta paralela a los proveedores activos y sintetiza el resultado
     */
    async #refreshAllProviders() {
        const startTime = Date.now();

        // Despacho concurrente de todos los providers
        const [tasaRealRes, infoDolarRes, bcrdRes, yahooRes] = await Promise.allSettled([
            this.tasaReal.getRates(),
            this.infoDolar.getRates(),
            this.bcrd.getRates(),
            this.yahoo.getRates()
        ]);

        const providerErrors = [];
        const activeProviders = [];
        let allObservations = [];

        // Telemetría TasaReal
        if (tasaRealRes.status === 'fulfilled' && tasaRealRes.value.success) {
            activeProviders.push('tasareal');
            allObservations = allObservations.concat(tasaRealRes.value.data || []);
            await this.#recordHealth('tasareal', true, tasaRealRes.value.latencyMs, tasaRealRes.value.recordsReceived, null, tasaRealRes.value.retryCount);
        } else {
            const err = tasaRealRes.status === 'rejected' ? tasaRealRes.reason.message : (tasaRealRes.value?.error || 'Falló');
            providerErrors.push({ provider: 'tasareal', error: err });
            await this.#recordHealth('tasareal', false, 0, 0, err, 0);
        }

        // Telemetría InfoDolar
        if (infoDolarRes.status === 'fulfilled' && infoDolarRes.value.success) {
            activeProviders.push('infodolar');
            allObservations = allObservations.concat(infoDolarRes.value.data || []);
            await this.#recordHealth('infodolar', true, infoDolarRes.value.latencyMs, infoDolarRes.value.recordsReceived, null, infoDolarRes.value.retryCount);
        } else {
            const err = infoDolarRes.status === 'rejected' ? infoDolarRes.reason.message : (infoDolarRes.value?.error || 'Falló');
            providerErrors.push({ provider: 'infodolar', error: err });
            await this.#recordHealth('infodolar', false, 0, 0, err, 0);
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
        }

        // Referencia de Mercado (Yahoo Finance)
        let marketRef = null;
        if (yahooRes.status === 'fulfilled' && yahooRes.value.success && yahooRes.value.data?.[0]) {
            const y = yahooRes.value.data[0];
            marketRef = {
                price: y.buy,
                prevClose: y.metadata?.prevClose || y.buy,
                change: y.metadata?.change || 0,
                changePercent: y.metadata?.changePercent || 0,
                observedAt: y.observedAt,
                provider: 'yahoo'
            };
        }

        // Si ningún agregador bancario respondió, intentar fallback a la caché existente o BD
        if (allObservations.length === 0) {
            console.warn('[FX] Ningún proveedor bancario devolvió datos frescos. Activando cascada de fallback.');
            if (this.cacheData) {
                return {
                    ...this.cacheData,
                    meta: {
                        ...this.cacheData.meta,
                        stale: true,
                        degraded: true,
                        providerErrors
                    }
                };
            }
            const dbFallback = await this.#loadLastSnapshotFromDb();
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
        
        let bestToSellUsd = null; // Mayor compra
        let bestToBuyUsd = null;  // Menor venta

        if (eligibleBanks.length) {
            const sortedByBuy = [...eligibleBanks].filter(b => b.buy).sort((a, b) => b.buy - a.buy);
            const sortedBySell = [...eligibleBanks].filter(b => b.sell).sort((a, b) => a.sell - b.sell);

            if (sortedByBuy.length) {
                bestToSellUsd = {
                    institutionId: sortedByBuy[0].institutionId,
                    institutionName: sortedByBuy[0].institutionName,
                    rate: sortedByBuy[0].buy,
                    validationStatus: sortedByBuy[0].validationStatus
                };
            }

            if (sortedBySell.length) {
                bestToBuyUsd = {
                    institutionId: sortedBySell[0].institutionId,
                    institutionName: sortedBySell[0].institutionName,
                    rate: sortedBySell[0].sell,
                    validationStatus: sortedBySell[0].validationStatus
                };
            }
        }

        const nowIso = new Date().toISOString();

        const payload = {
            pair: 'USD/DOP',
            generatedAt: nowIso,
            summary: {
                avgBuy,
                avgSell,
                avgSpread,
                institutionsCount: consolidatedBanks.length,
                bestToSellUsd,
                bestToBuyUsd
            },
            bestRates: {
                bestToSellUsd,
                bestToBuyUsd
            },
            reference: {
                market: marketRef || this.cacheData?.reference?.market || null,
                official: officialRef || this.cacheData?.reference?.official || null
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

        // Persistir en PostgreSQL de manera asíncrona sin bloquear la respuesta
        this.#persistObservationsToDb(consolidatedBanks).catch(err => {
            console.error('[FX] Error persistiendo observaciones en BD:', err.message);
        });

        return payload;
    }

    /**
     * Persistencia deduplicada en PostgreSQL/SQLite
     * Solo inserta una nueva fila histórica si la tasa cambió significativamente o cambió de fecha
     */
    async #persistObservationsToDb(banks) {
        if (!banks || !banks.length) return;
        const today = new Date().toISOString().split('T')[0];

        for (const bank of banks) {
            try {
                // Buscar la última observación registrada para esta institución
                const lastObs = await FxRateObservation.findOne({
                    where: { institutionId: bank.institutionId },
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
     * Carga el último estado válido completo desde la base de datos
     */
    async #loadLastSnapshotFromDb() {
        try {
            // Traer las observaciones más recientes por institución
            const latestRecords = await FxRateObservation.findAll({
                order: [['observed_at', 'DESC'], ['id', 'DESC']],
                limit: 50
            });

            if (!latestRecords || latestRecords.length === 0) return null;

            // Agrupar por institutionId conservando solo el más reciente
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
            const bestToSellUsd = sortedByBuy.length ? {
                institutionId: sortedByBuy[0].institutionId,
                institutionName: sortedByBuy[0].institutionName,
                rate: sortedByBuy[0].buy,
                validationStatus: sortedByBuy[0].validationStatus
            } : null;
            const bestToBuyUsd = sortedBySell.length ? {
                institutionId: sortedBySell[0].institutionId,
                institutionName: sortedBySell[0].institutionName,
                rate: sortedBySell[0].sell,
                validationStatus: sortedBySell[0].validationStatus
            } : null;

            return {
                pair: 'USD/DOP',
                generatedAt: latestRecords[0].observedAt,
                summary: {
                    avgBuy,
                    avgSell,
                    avgSpread,
                    institutionsCount: banks.length,
                    bestToSellUsd,
                    bestToBuyUsd
                },
                bestRates: {
                    bestToSellUsd,
                    bestToBuyUsd
                },
                reference: {
                    market: null,
                    official: null
                },
                banks,
                meta: {
                    cache: true,
                    stale: true,
                    fromDb: true
                }
            };
        } catch (error) {
            console.error('[FX] No se pudo cargar snapshot desde BD:', error.message);
            return null;
        }
    }

    /**
     * Registra evento de salud y latencia de un proveedor en FxProviderHealth
     */
    async #recordHealth(provider, success, latencyMs, recordsReceived, errorType, retryCount) {
        try {
            await FxProviderHealth.create({
                provider,
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
     * Retorna la serie histórica de una institución o del mercado general para gráficos (Step / Line)
     */
    async getHistory(institutionId, days = 30) {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const where = {
            observedAt: { [Op.gte]: sinceDate }
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
    async getTasaRealEvaluation(days = 29) {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const healthLogs = await FxProviderHealth.findAll({
            where: {
                provider: 'tasareal',
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
        const comparisons = await FxRateObservation.findAll({
            where: {
                observedAt: { [Op.gte]: sinceDate }
            },
            limit: 500
        });

        const verifiedCount = comparisons.filter(c => c.validationStatus === 'VERIFIED').length;
        const agreementRate = comparisons.length > 0 ? Math.round((verifiedCount / comparisons.length) * 10000) / 100 : 100;

        return {
            periodDays: days,
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
