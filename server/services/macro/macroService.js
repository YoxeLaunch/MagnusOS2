/**
 * ============================================================================
 * MACRO RD // ORCHESTRATOR & MACRO INTELLIGENCE SERVICE
 * Cache multi-frecuencia, persistencia histórica, métricas derivadas & fallback
 * ============================================================================
 */

import { BcrdMacroProvider } from './bcrdMacroProvider.js';
import { eventEngine } from './eventEngine.js';
import { fxService } from '../fx/fxService.js';
import {
    MacroIndicator,
    MacroObservation,
    MacroSourceHealth,
    sequelize
} from '../../models/index.js';
import { Op } from 'sequelize';

// Definición canónica de indicadores macro dominicanos iniciales
export const MASTER_INDICATORS = [
    {
        id: 'INFLATION_YOY',
        name: 'Inflación Interanual',
        shortName: 'IPC YoY',
        category: 'PRICES',
        frequency: 'MONTHLY',
        unit: '%',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'Variación porcentual interanual del Índice de Precios al Consumidor (IPC). Meta oficial del BCRD: 4.0% ± 1.0%.',
        magnusInterpretation: 'Mide la pérdida de poder adquisitivo del peso dominicano en los últimos 12 meses. Valores dentro de la meta (3%-5%) preservan la estabilidad macroeconómica.',
        preferredChartType: 'line',
        priorityOrder: 1
    },
    {
        id: 'TPM',
        name: 'Tasa de Política Monetaria',
        shortName: 'TPM',
        category: 'MONETARY_POLICY',
        frequency: 'EVENT_DRIVEN',
        unit: '%',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'Tasa de referencia para operaciones de liquidez del BCRD a un día. Fija la postura monetaria del país.',
        magnusInterpretation: 'Tasa rectora del costo del dinero. Reducciones tienden a abaratar el crédito e impulsar la economía; aumentos buscan anclar expectativas de inflación.',
        preferredChartType: 'step',
        priorityOrder: 2
    },
    {
        id: 'RATE_ACTIVE',
        name: 'Tasa Activa Promedio',
        shortName: 'Tasa Activa',
        category: 'BANKING',
        frequency: 'MONTHLY',
        unit: '%',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'Tasa de interés promedio ponderado cobrada por la banca múltiple en préstamos concedidos.',
        magnusInterpretation: 'Referencia directa para financiamiento comercial, préstamos personales e hipotecas en la banca nacional.',
        preferredChartType: 'line',
        priorityOrder: 3
    },
    {
        id: 'RATE_PASSIVE',
        name: 'Tasa Pasiva Promedio',
        shortName: 'Tasa Pasiva',
        category: 'BANKING',
        frequency: 'MONTHLY',
        unit: '%',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'Tasa de interés promedio ponderado pagada por la banca múltiple sobre depósitos y certificados financieros.',
        magnusInterpretation: 'Rendimiento base que perciben ahorristas e inversionistas en instrumentos de renta fija tradicional en moneda nacional.',
        preferredChartType: 'line',
        priorityOrder: 4
    },
    {
        id: 'IMAE_YOY',
        name: 'IMAE (Actividad Económica)',
        shortName: 'IMAE YoY',
        category: 'ACTIVITY',
        frequency: 'MONTHLY',
        unit: '%',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'Índice Mensual de Actividad Económica. Aproxima la trayectoria del Producto Interno Bruto (PIB) con frecuencia mensual.',
        magnusInterpretation: 'Pulso de la producción física y servicios en la República Dominicana. Tasas sobre el 4.5% reflejan un ciclo expansivo vigoroso.',
        preferredChartType: 'line',
        priorityOrder: 5
    },
    {
        id: 'PRIVATE_CREDIT_YOY',
        name: 'Crédito al Sector Privado',
        shortName: 'Crédito Privado',
        category: 'CREDIT',
        frequency: 'MONTHLY',
        unit: '%',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'Crecimiento interanual del financiamiento total otorgado por el sistema financiero a empresas y hogares.',
        magnusInterpretation: 'Mide la fluidez crediticia de la economía. Un crecimiento saludable de dos dígitos suele acompañar la inversión privada.',
        preferredChartType: 'line',
        priorityOrder: 6
    },
    {
        id: 'RESERVES_NET',
        name: 'Reservas Internacionales Netas',
        shortName: 'Reservas RIN',
        category: 'EXTERNAL',
        frequency: 'MONTHLY',
        unit: 'US$ MM',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'Activos de reserva externos netos en poder del BCRD para respaldar compromisos y estabilidad cambiaria.',
        magnusInterpretation: 'Colchón de liquidez externa de la República Dominicana. Niveles sobre US$ 14,000 MM aseguran más de 5 meses de importaciones.',
        preferredChartType: 'line',
        priorityOrder: 7
    },
    {
        id: 'USD_DOP_BCRD',
        name: 'USD / DOP (Referencia BCRD)',
        shortName: 'USD Oficial',
        category: 'FX',
        frequency: 'DAILY',
        unit: 'RD$',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'Tipo de cambio spot de referencia oficial publicado por el Banco Central de la República Dominicana.',
        magnusInterpretation: 'Cotización central utilizada para liquidaciones oficiales, contabilidad tributaria y referencia cambiaria nacional.',
        preferredChartType: 'line',
        priorityOrder: 8
    },
    {
        id: 'INFLATION_MONTHLY',
        name: 'Inflación Mensual',
        shortName: 'IPC Mensual',
        category: 'PRICES',
        frequency: 'MONTHLY',
        unit: '%',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'Variación mensual del IPC respecto al mes inmediatamente anterior.',
        magnusInterpretation: 'Indica la aceleración inmediata de corto plazo en la canasta básica.',
        preferredChartType: 'line',
        priorityOrder: 9
    },
    {
        id: 'INFLATION_CORE',
        name: 'Inflación Subyacente',
        shortName: 'IPC Subyacente',
        category: 'PRICES',
        frequency: 'MONTHLY',
        unit: '%',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'IPC excluyendo componentes volátiles como alimentos agrícolas perecederos y combustibles.',
        magnusInterpretation: 'Es la variable que guía directamente las decisiones de tasa de interés del Banco Central.',
        preferredChartType: 'line',
        priorityOrder: 10
    },
    {
        id: 'RATE_INTERBANK',
        name: 'Tasa Interbancaria',
        shortName: 'Tasa Interbancaria',
        category: 'BANKING',
        frequency: 'MONTHLY',
        unit: '%',
        source: 'BCRD',
        sourceUrl: 'https://www.bancentral.gov.do/',
        description: 'Tasa pactada en operaciones de préstamo de liquidez no colateralizada entre bancos comerciales.',
        magnusInterpretation: 'Termómetro de la liquidez diaria interbancaria; debe orbitar cerca del corredor de la TPM.',
        preferredChartType: 'line',
        priorityOrder: 11
    }
];

export class MacroService {
    constructor() {
        this.bcrdProvider = new BcrdMacroProvider();
        this.cache = new Map(); // en memoria por indicador
        this.lastConsolidatedPayload = null;
        this.lastConsolidatedTimestamp = 0;
        this.cacheTtlMs = 60 * 60 * 1000; // 60 minutos default
        this.refreshPromise = null;
    }

    /**
     * Asegura que los indicadores maestros existan en la tabla macro_indicators
     */
    async ensureMasterCatalog() {
        try {
            for (const item of MASTER_INDICATORS) {
                await MacroIndicator.findOrCreate({
                    where: { id: item.id },
                    defaults: item
                });
            }
        } catch (err) {
            console.warn('[MACRO_SERVICE] Advertencia sincronizando catálogo maestro:', err.message);
        }
    }

    /**
     * Obtiene el resumen de KPIs macroeconómicos de la República Dominicana
     * Utiliza Stale-While-Revalidate con Single-Flight Lock
     */
    async getMacroSummary({ forceRefresh = false } = {}) {
        const now = Date.now();
        const isFresh = this.lastConsolidatedPayload && (now - this.lastConsolidatedTimestamp < this.cacheTtlMs);

        if (isFresh && !forceRefresh) {
            return this.lastConsolidatedPayload;
        }

        if (forceRefresh) {
            return this.#executeRefresh();
        }

        if (this.lastConsolidatedPayload) {
            // SWR: Retornar caché anterior y refrescar en segundo plano
            this.#executeRefresh().catch(err => {
                console.warn('[MACRO_SERVICE] Refresco en segundo plano falló:', err.message);
            });
            return this.lastConsolidatedPayload;
        }

        // Si no hay caché, sincronizar inmediatamente
        return this.#executeRefresh();
    }

    /**
     * Bloqueo Single-Flight para evitar estampidas concurrentes
     */
    async #executeRefresh() {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async () => {
            try {
                await this.ensureMasterCatalog();
                let observations = [];
                let latencyMs = 0;
                let fetchError = null;

                // Paso 1: Consultar proveedor oficial BCRD
                try {
                    const result = await this.bcrdProvider.fetchMacroIndicators();
                    observations = result.observations;
                    latencyMs = result.latencyMs;

                    await MacroSourceHealth.create({
                        source: 'BCRD',
                        success: true,
                        latencyMs,
                        recordsReceived: observations.length,
                        timestamp: new Date()
                    });
                } catch (err) {
                    fetchError = err;
                    console.error('[MACRO_SERVICE] Error consultando BCRD oficial:', err.message);

                    await MacroSourceHealth.create({
                        source: 'BCRD',
                        success: false,
                        latencyMs: 0,
                        recordsReceived: 0,
                        errorType: err.message,
                        timestamp: new Date()
                    });
                }

                // Paso 2: Reutilizar Providence FX para complementar si hace falta
                try {
                    const fxUsd = await fxService.getUsdDopRates();
                    const officialRate = fxUsd?.summary?.institutions?.find(i => i.id === 'bcrd' || i.id === 'bancentral');
                    if (officialRate && (!observations.find(o => o.indicatorId === 'USD_DOP_BCRD'))) {
                        observations.push({
                            indicatorId: 'USD_DOP_BCRD',
                            indicatorName: 'USD / DOP (Referencia BCRD)',
                            category: 'FX',
                            frequency: 'DAILY',
                            value: officialRate.sell || officialRate.mid || 60.40,
                            unit: 'RD$',
                            referencePeriod: new Date().toISOString().split('T')[0],
                            source: 'BCRD',
                            sourceUrl: 'https://www.bancentral.gov.do/'
                        });
                    }
                } catch (fxErr) {
                    // Si FX no está disponible, no es bloqueante
                }

                // Paso 3: Persistir observaciones y detectar eventos
                if (observations.length > 0) {
                    for (const obs of observations) {
                        await this.#persistObservationAndTriggerEvents(obs);
                    }
                }

                // Paso 4: Construir el payload consolidado cargando el último dato real de la DB
                const consolidated = await this.#buildConsolidatedPayload(fetchError ? 'DEGRADED' : 'ONLINE');
                this.lastConsolidatedPayload = consolidated;
                this.lastConsolidatedTimestamp = Date.now();

                return consolidated;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    /**
     * Persiste una observación asegurando unicidad por indicador y periodo de referencia
     * Ejecuta detección de eventos mediante MagnusEventEngine
     */
    async #persistObservationAndTriggerEvents(incoming) {
        try {
            // Buscar la última observación registrada previa
            const latestPrior = await MacroObservation.findOne({
                where: { indicatorId: incoming.indicatorId },
                order: [['observedAt', 'DESC']]
            });

            // Buscar si ya existe una observación para ESTE periodo de referencia exacto
            const existingForPeriod = await MacroObservation.findOne({
                where: {
                    indicatorId: incoming.indicatorId,
                    referencePeriod: incoming.referencePeriod
                }
            });

            let finalObs = null;

            if (existingForPeriod) {
                // Caso: Mismo periodo de referencia
                if (existingForPeriod.value !== incoming.value) {
                    // Revisión estadística oficial
                    const original = existingForPeriod.originalValue || existingForPeriod.value;
                    const changeAbs = Math.round((incoming.value - existingForPeriod.value) * 10000) / 10000;
                    const changePct = existingForPeriod.value !== 0 ? Math.round((changeAbs / existingForPeriod.value) * 10000) / 100 : 0;

                    await existingForPeriod.update({
                        value: incoming.value,
                        revision: existingForPeriod.revision + 1,
                        originalValue: original,
                        previousValue: existingForPeriod.value,
                        changeAbsolute: changeAbs,
                        changePercent: changePct,
                        observedAt: new Date(),
                        metadata: incoming.metadata || existingForPeriod.metadata
                    });

                    finalObs = existingForPeriod;
                } else {
                    // Valor idéntico para el mismo periodo: actualizamos timestamp de verificación sin duplicar
                    await existingForPeriod.update({ observedAt: new Date() });
                    finalObs = existingForPeriod;
                }
            } else {
                // Caso: Nueva publicación para un nuevo periodo
                let changeAbs = null;
                let changePct = null;
                let prevVal = null;

                if (latestPrior) {
                    prevVal = latestPrior.value;
                    changeAbs = Math.round((incoming.value - latestPrior.value) * 10000) / 10000;
                    changePct = latestPrior.value !== 0 ? Math.round((changeAbs / latestPrior.value) * 10000) / 100 : 0;
                }

                finalObs = await MacroObservation.create({
                    indicatorId: incoming.indicatorId,
                    referencePeriod: incoming.referencePeriod,
                    value: incoming.value,
                    unit: incoming.unit,
                    frequency: incoming.frequency || 'MONTHLY',
                    observedAt: new Date(),
                    source: incoming.source || 'BCRD',
                    sourceUrl: incoming.sourceUrl || 'https://www.bancentral.gov.do/',
                    revision: 1,
                    originalValue: incoming.value,
                    previousValue: prevVal,
                    changeAbsolute: changeAbs,
                    changePercent: changePct,
                    isDerived: false,
                    metadata: incoming.metadata || null
                });
            }

            // Evaluar a través del Event Engine
            await eventEngine.evaluateObservation({
                ...incoming,
                domain: 'MACRO_RD'
            }, latestPrior ? latestPrior.toJSON() : null);

            return finalObs;
        } catch (err) {
            console.error(`[MACRO_SERVICE] Error persistiendo observación ${incoming.indicatorId}:`, err.message);
            return null;
        }
    }

    /**
     * Construye el payload completo de KPIs y métricas derivadas para la UI
     */
    async #buildConsolidatedPayload(sourceStatus = 'ONLINE') {
        // Cargar últimos registros reales de cada indicador
        const indicators = await MacroIndicator.findAll({
            where: { isActive: true },
            order: [['priorityOrder', 'ASC']]
        });

        const kpis = [];

        for (const meta of indicators) {
            const latest = await MacroObservation.findOne({
                where: { indicatorId: meta.id },
                order: [['observedAt', 'DESC']]
            });

            if (latest) {
                kpis.push({
                    id: meta.id,
                    name: meta.name,
                    shortName: meta.shortName,
                    category: meta.category,
                    frequency: meta.frequency,
                    unit: meta.unit,
                    value: latest.value,
                    previousValue: latest.previousValue,
                    changeAbsolute: latest.changeAbsolute,
                    changePercent: latest.changePercent,
                    referencePeriod: latest.referencePeriod,
                    publishedAt: latest.publishedAt,
                    observedAt: latest.observedAt,
                    source: latest.source,
                    sourceUrl: latest.sourceUrl || meta.sourceUrl,
                    revision: latest.revision,
                    preferredChartType: meta.preferredChartType,
                    description: meta.description,
                    magnusInterpretation: meta.magnusInterpretation,
                    metadata: latest.metadata
                });
            }
        }

        // =========================================================================
        // MÉTRICAS DERIVADAS (TRANSPARENTES // MAGNUS CAPITAL)
        // =========================================================================
        const tpmVal = kpis.find(k => k.id === 'TPM')?.value || null;
        const ipcVal = kpis.find(k => k.id === 'INFLATION_YOY')?.value || null;
        const actVal = kpis.find(k => k.id === 'RATE_ACTIVE')?.value || null;
        const pasVal = kpis.find(k => k.id === 'RATE_PASSIVE')?.value || null;

        // 1. Tasa Real Simple = TPM - Inflación Interanual (Aproximación ex-post)
        let realRateSimple = null;
        if (tpmVal !== null && ipcVal !== null) {
            realRateSimple = Math.round((tpmVal - ipcVal) * 100) / 100;
        }

        // 2. Spread Bancario = Tasa Activa Promedio - Tasa Pasiva Promedio
        let bankingSpread = null;
        if (actVal !== null && pasVal !== null) {
            bankingSpread = Math.round((actVal - pasVal) * 100) / 100;
        }

        const derivedMetrics = {
            realRateSimple: {
                name: 'Tasa Real Simple',
                value: realRateSimple,
                unit: '%',
                formula: 'TPM - Inflación Interanual',
                note: 'Aproximación ex-post calculada por Magnus. Una tasa real positiva contribuye al anclaje de expectativas y ahorro interno.',
                type: 'DERIVED',
                source: 'MAGNUS'
            },
            bankingSpread: {
                name: 'Spread Bancario Promedio',
                value: bankingSpread,
                unit: 'pp',
                formula: 'Tasa Activa - Tasa Pasiva',
                note: 'Margen de intermediación financiera promedio ponderado en la banca múltiple dominicana.',
                type: 'DERIVED',
                source: 'MAGNUS'
            }
        };

        // Telemetría de la última verificación
        const lastHealth = await MacroSourceHealth.findOne({
            where: { source: 'BCRD' },
            order: [['timestamp', 'DESC']]
        });

        return {
            status: sourceStatus,
            module: 'Contexto Macro RD',
            count: kpis.length,
            syncedAt: new Date().toISOString(),
            sourceHealth: {
                source: 'BCRD',
                isHealthy: lastHealth ? lastHealth.success : true,
                latencyMs: lastHealth ? lastHealth.latencyMs : null,
                lastChecked: lastHealth ? lastHealth.timestamp : new Date().toISOString()
            },
            derivedMetrics,
            kpis
        };
    }

    /**
     * Obtiene el histórico y detalle profundo de un indicador específico
     */
    async getIndicatorHistory(indicatorId, range = '1Y') {
        const indicator = await MacroIndicator.findByPk(indicatorId);
        if (!indicator) {
            return null;
        }

        let dateLimit = new Date();
        if (range === '1Y') dateLimit.setFullYear(dateLimit.getFullYear() - 1);
        else if (range === '3Y') dateLimit.setFullYear(dateLimit.getFullYear() - 3);
        else if (range === '5Y') dateLimit.setFullYear(dateLimit.getFullYear() - 5);
        else if (range === '10Y') dateLimit.setFullYear(dateLimit.getFullYear() - 10);
        else dateLimit = new Date(0); // ALL

        const observations = await MacroObservation.findAll({
            where: {
                indicatorId,
                observedAt: { [Op.gte]: dateLimit }
            },
            order: [['observedAt', 'ASC']]
        });

        return {
            indicator,
            range,
            count: observations.length,
            series: observations.map(o => ({
                id: o.id,
                period: o.referencePeriod,
                value: o.value,
                unit: o.unit,
                revision: o.revision,
                changeAbsolute: o.changeAbsolute,
                changePercent: o.changePercent,
                observedAt: o.observedAt
            }))
        };
    }
}

export const macroService = new MacroService();
