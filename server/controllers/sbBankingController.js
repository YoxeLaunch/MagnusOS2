/**
 * ============================================================================
 * SUPERINTENDENCIA DE BANCOS (SB) // BANKING CONTROLLER
 * Calculation and serving of institutional banking KPIs, yields, and time series
 * ============================================================================
 */

import { sequelize, SbBankingMetric, SbSyncRun } from '../models/index.js';
import { sbStatisticsService } from '../services/sb/sbStatisticsService.js';
import { Op } from 'sequelize';
import { calculateHhi, classifyHhi } from '../services/sb/sbMetrics.js';

// In-Memory SWR Cache for fast reads
const memoryCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCached(key) {
    const cached = memoryCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }
    return null;
}

function setCache(key, data) {
    memoryCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Helper: Obtiene el último período disponible en base de datos
 */
async function getLatestPeriod() {
    const row = await SbBankingMetric.findOne({
        attributes: ['periodo'],
        order: [['periodo', 'DESC']]
    });
    return row ? row.periodo : null;
}

/**
 * 1. Resumen General del Sistema Financiero
 * GET /api/markets/banking/summary
 */
export const getBankingSummary = async (req, res) => {
    try {
        const targetPeriod = req.query.period || await getLatestPeriod();
        if (!targetPeriod) {
            return res.json({
                success: true,
                message: 'No hay datos bancarios registrados aún. Se requiere sincronización inicial.',
                data: null
            });
        }

        const cacheKey = `summary_${targetPeriod}`;
        const cached = getCached(cacheKey);
        if (cached && req.query.refresh !== 'true') {
            return res.json({ success: true, cached: true, data: cached });
        }

        // Obtener período anterior para cálculo de crecimiento MoM
        const [prevPeriodRow] = await sequelize.query(`
            SELECT DISTINCT periodo FROM public.sb_banking_metrics
            WHERE periodo < $1 ORDER BY periodo DESC LIMIT 1;
        `, { bind: [targetPeriod] });
        const prevPeriod = prevPeriodRow[0]?.periodo || null;

        // Métricas agregadas por divisa del período actual
        const [currencyAggs] = await sequelize.query(`
            SELECT
                currency_iso,
                SUM(balance) as total_balance,
                SUM(cantidad_instrumentos) as total_instruments,
                SUM(tasa_ponderada_balance) as sum_weighted_prod,
                CASE WHEN SUM(balance) > 0
                     THEN ROUND((SUM(tasa_ponderada_balance) / SUM(balance))::numeric, 4)
                     ELSE 0 END as weighted_yield
            FROM public.sb_banking_metrics
            WHERE periodo = $1
            GROUP BY currency_iso;
        `, { bind: [targetPeriod] });

        // Total general del sistema
        let totalSystemBalance = 0;
        let totalInstruments = 0;
        let sumWeightedTotal = 0;
        const currencyMap = {};

        for (const row of currencyAggs) {
            const bal = parseFloat(row.total_balance) || 0;
            const inst = parseInt(row.total_instruments, 10) || 0;
            const yieldRate = parseFloat(row.weighted_yield) || 0;
            const weightedProd = parseFloat(row.sum_weighted_prod) || 0;

            totalSystemBalance += bal;
            totalInstruments += inst;
            sumWeightedTotal += weightedProd;

            currencyMap[row.currency_iso] = {
                currency: row.currency_iso,
                totalBalance: bal,
                totalInstruments: inst,
                weightedYieldPct: yieldRate
            };
        }

        // Crecimiento mensual MoM (si existe período previo)
        let momGrowthPct = null;
        let prevSystemBalance = null;
        if (prevPeriod) {
            const [[prevSum]] = await sequelize.query(`
                SELECT SUM(balance) as total_prev FROM public.sb_banking_metrics WHERE periodo = $1;
            `, { bind: [prevPeriod] });
            prevSystemBalance = parseFloat(prevSum?.total_prev) || null;
            if (prevSystemBalance && prevSystemBalance > 0) {
                momGrowthPct = Number((((totalSystemBalance - prevSystemBalance) / prevSystemBalance) * 100).toFixed(2));
            }
        }

        // Top 5 bancos por volumen y market share
        const [topBanks] = await sequelize.query(`
            SELECT
                entidad,
                tipo_entidad,
                SUM(balance) as balance,
                ROUND((SUM(balance) / $1 * 100)::numeric, 2) as market_share_pct,
                CASE WHEN SUM(balance) > 0
                     THEN ROUND((SUM(tasa_ponderada_balance) / SUM(balance))::numeric, 4)
                     ELSE 0 END as weighted_yield_pct
            FROM public.sb_banking_metrics
            WHERE periodo = $2
            GROUP BY entidad, tipo_entidad
            ORDER BY balance DESC
            LIMIT 5;
        `, { bind: [totalSystemBalance > 0 ? totalSystemBalance : 1, targetPeriod] });

        const [entityBalances] = await sequelize.query(`
            SELECT SUM(balance) AS balance
            FROM public.sb_banking_metrics
            WHERE periodo = $1
            GROUP BY entidad;
        `, { bind: [targetPeriod] });
        const hhiValue = calculateHhi(entityBalances.map(row => row.balance));

        // Distribución física vs jurídica
        const [holderDistribution] = await sequelize.query(`
            SELECT
                persona,
                SUM(balance) as balance,
                SUM(cantidad_instrumentos) as instruments,
                ROUND((SUM(balance) / $1 * 100)::numeric, 2) as share_pct
            FROM public.sb_banking_metrics
            WHERE periodo = $2
            GROUP BY persona;
        `, { bind: [totalSystemBalance > 0 ? totalSystemBalance : 1, targetPeriod] });

        // Índice de Dolarización (DSI): Depósitos USD (equivalente DOP) / Total Sistema
        const usdBalance = currencyMap['USD']?.totalBalance || 0;
        const dollarizationIndexPct = totalSystemBalance > 0
            ? Number(((usdBalance / totalSystemBalance) * 100).toFixed(2))
            : 0;

        const payload = {
            periodo: targetPeriod,
            previousPeriodo: prevPeriod,
            totalSystemBalanceDop: totalSystemBalance,
            totalInstruments,
            systemWeightedYieldPct: totalSystemBalance > 0 ? Number((sumWeightedTotal / totalSystemBalance).toFixed(4)) : 0,
            momGrowthPct,
            dollarizationIndex: {
                dsiPct: dollarizationIndexPct,
                usdDepositsEquivDop: usdBalance,
                totalSystemDop: totalSystemBalance,
                methodology: 'SB_DOMINICAN_REPUBLIC_OFFICIAL_DOP_EQUIVALENT'
            },
            hhi: {
                value: hhiValue,
                scale: '0-10000',
                classification: classifyHhi(hhiValue),
                methodology: 'SUM_OF_ENTITY_MARKET_SHARE_PERCENT_SQUARED',
                disclaimer: 'Criterio analítico de concentración; no es una evaluación de solvencia.'
            },
            currencies: currencyMap,
            topBanks: topBanks.map(b => ({
                entidad: b.entidad,
                tipoEntidad: b.tipo_entidad,
                balance: parseFloat(b.balance),
                marketSharePct: parseFloat(b.market_share_pct),
                weightedYieldPct: parseFloat(b.weighted_yield_pct)
            })),
            holderDistribution: holderDistribution.map(h => ({
                persona: h.persona,
                balance: parseFloat(h.balance),
                instruments: parseInt(h.instruments, 10),
                sharePct: parseFloat(h.share_pct)
            }))
        };

        setCache(cacheKey, payload);
        res.json({ success: true, cached: false, data: payload });

    } catch (error) {
        console.error('[SB_CONTROLLER] Error en getBankingSummary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 2. Rendimientos y Tasas Pasivas Ponderadas
 * GET /api/markets/banking/yields?currency=DOP | USD
 */
export const getBankingYields = async (req, res) => {
    try {
        const currency = (req.query.currency || 'DOP').toUpperCase();
        const targetPeriod = req.query.period || await getLatestPeriod();

        if (!targetPeriod) {
            return res.json({ success: true, data: [] });
        }

        const cacheKey = `yields_${targetPeriod}_${currency}`;
        const cached = getCached(cacheKey);
        if (cached && req.query.refresh !== 'true') {
            return res.json({ success: true, cached: true, data: cached });
        }

        const [rows] = await sequelize.query(`
            SELECT
                entidad,
                tipo_entidad,
                SUM(balance) as total_balance,
                SUM(cantidad_instrumentos) as total_instruments,
                CASE WHEN SUM(balance) > 0
                     THEN ROUND((SUM(tasa_ponderada_balance) / SUM(balance))::numeric, 4)
                     ELSE 0 END as weighted_yield_pct,
                MIN(tasa_ponderada) as min_tasa,
                MAX(tasa_ponderada) as max_tasa
            FROM public.sb_banking_metrics
            WHERE periodo = $1 AND currency_iso = $2
            GROUP BY entidad, tipo_entidad
            HAVING SUM(balance) > 1000000 -- Filtrar instituciones con balance material
            ORDER BY weighted_yield_pct DESC;
        `, { bind: [targetPeriod, currency] });

        const results = rows.map((r, index) => ({
            rank: index + 1,
            entidad: r.entidad,
            tipoEntidad: r.tipo_entidad,
            currency,
            totalBalance: parseFloat(r.total_balance),
            totalInstruments: parseInt(r.total_instruments, 10),
            weightedYieldPct: parseFloat(r.weighted_yield_pct),
            minTasaPct: parseFloat(r.min_tasa),
            maxTasaPct: parseFloat(r.max_tasa)
        }));

        setCache(cacheKey, results);
        res.json({ success: true, cached: false, periodo: targetPeriod, currency, data: results });

    } catch (error) {
        console.error('[SB_CONTROLLER] Error en getBankingYields:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 3. Captaciones y Cuota de Mercado por Entidad
 * GET /api/markets/banking/deposits
 */
export const getBankingDeposits = async (req, res) => {
    try {
        const targetPeriod = req.query.period || await getLatestPeriod();
        if (!targetPeriod) return res.json({ success: true, data: [] });

        const cacheKey = `deposits_${targetPeriod}`;
        const cached = getCached(cacheKey);
        if (cached && req.query.refresh !== 'true') {
            return res.json({ success: true, cached: true, data: cached });
        }

        const [rows] = await sequelize.query(`
            WITH totals AS (
                SELECT SUM(balance) as system_total FROM public.sb_banking_metrics WHERE periodo = $1
            )
            SELECT
                m.entidad,
                m.tipo_entidad,
                SUM(m.balance) as total_balance,
                SUM(CASE WHEN m.currency_iso = 'DOP' THEN m.balance ELSE 0 END) as balance_dop,
                SUM(CASE WHEN m.currency_iso = 'USD' THEN m.balance ELSE 0 END) as balance_usd,
                SUM(CASE WHEN m.currency_iso = 'EUR' THEN m.balance ELSE 0 END) as balance_eur,
                SUM(m.cantidad_instrumentos) as total_instruments,
                ROUND((SUM(m.balance) / t.system_total * 100)::numeric, 4) as market_share_pct
            FROM public.sb_banking_metrics m
            CROSS JOIN totals t
            WHERE m.periodo = $1
            GROUP BY m.entidad, m.tipo_entidad, t.system_total
            ORDER BY total_balance DESC;
        `, { bind: [targetPeriod] });

        const results = rows.map((r, index) => ({
            rank: index + 1,
            entidad: r.entidad,
            tipoEntidad: r.tipo_entidad,
            totalBalance: parseFloat(r.total_balance),
            balanceDop: parseFloat(r.balance_dop),
            balanceUsd: parseFloat(r.balance_usd),
            balanceEur: parseFloat(r.balance_eur),
            totalInstruments: parseInt(r.total_instruments, 10),
            marketSharePct: parseFloat(r.market_share_pct)
        }));

        setCache(cacheKey, results);
        res.json({ success: true, cached: false, periodo: targetPeriod, data: results });

    } catch (error) {
        console.error('[SB_CONTROLLER] Error en getBankingDeposits:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 4. Tendencia del Índice de Dolarización (DSI)
 * GET /api/markets/banking/dollarization-trend
 */
export const getDollarizationTrend = async (req, res) => {
    try {
        const cacheKey = 'dollarization_trend';
        const cached = getCached(cacheKey);
        if (cached && req.query.refresh !== 'true') {
            return res.json({ success: true, cached: true, data: cached });
        }

        const [rows] = await sequelize.query(`
            SELECT
                periodo,
                SUM(CASE WHEN currency_iso = 'DOP' THEN balance ELSE 0 END) as total_dop,
                SUM(CASE WHEN currency_iso = 'USD' THEN balance ELSE 0 END) as total_usd,
                SUM(CASE WHEN currency_iso = 'EUR' THEN balance ELSE 0 END) as total_eur,
                SUM(balance) as total_system,
                ROUND((SUM(CASE WHEN currency_iso = 'USD' THEN balance ELSE 0 END) / NULLIF(SUM(balance), 0) * 100)::numeric, 2) as dsi_pct,
                ROUND((SUM(CASE WHEN currency_iso = 'DOP' THEN tasa_ponderada_balance ELSE 0 END) / NULLIF(SUM(CASE WHEN currency_iso = 'DOP' THEN balance ELSE 0 END), 0))::numeric, 4) as dop_yield_pct,
                ROUND((SUM(CASE WHEN currency_iso = 'USD' THEN tasa_ponderada_balance ELSE 0 END) / NULLIF(SUM(CASE WHEN currency_iso = 'USD' THEN balance ELSE 0 END), 0))::numeric, 4) as usd_yield_pct
            FROM public.sb_banking_metrics
            GROUP BY periodo
            ORDER BY periodo ASC;
        `);

        const trend = rows.map(r => ({
            periodo: r.periodo,
            totalDop: parseFloat(r.total_dop),
            totalUsd: parseFloat(r.total_usd),
            totalEur: parseFloat(r.total_eur),
            totalSystem: parseFloat(r.total_system),
            dsiPct: parseFloat(r.dsi_pct || '0'),
            dopYieldPct: parseFloat(r.dop_yield_pct || '0'),
            usdYieldPct: parseFloat(r.usd_yield_pct || '0')
        }));

        const responsePayload = {
            methodology: 'SB_DOMINICAN_REPUBLIC_OFFICIAL_DOP_EQUIVALENT',
            explanation: 'La Superintendencia de Bancos publica los balances en moneda extranjera ya convertidos a pesos dominicanos (DOP) según su tasa contable oficial. El ratio DSI refleja la participación de los depósitos en USD sobre el ahorro bancario total.',
            timeSeries: trend
        };

        setCache(cacheKey, responsePayload);
        res.json({ success: true, cached: false, data: responsePayload });

    } catch (error) {
        console.error('[SB_CONTROLLER] Error en getDollarizationTrend:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 5. Ficha Detallada de Institución Bancaria
 * GET /api/markets/banking/institution/:entity
 */
export const getBankingInstitution = async (req, res) => {
    try {
        const entityName = req.params.entity.toUpperCase().trim();
        const latestPeriod = await getLatestPeriod();

        if (!latestPeriod) {
            return res.status(404).json({ success: false, error: 'No hay datos bancarios registrados.' });
        }

        // Histórico de balance de la entidad
        const [historyRows] = await sequelize.query(`
            SELECT
                periodo,
                SUM(balance) as total_balance,
                SUM(CASE WHEN currency_iso = 'DOP' THEN balance ELSE 0 END) as balance_dop,
                SUM(CASE WHEN currency_iso = 'USD' THEN balance ELSE 0 END) as balance_usd,
                SUM(CASE WHEN currency_iso = 'EUR' THEN balance ELSE 0 END) as balance_eur,
                SUM(cantidad_instrumentos) as total_instruments,
                CASE WHEN SUM(balance) > 0
                     THEN ROUND((SUM(tasa_ponderada_balance) / SUM(balance))::numeric, 4)
                     ELSE 0 END as weighted_yield_pct
            FROM public.sb_banking_metrics
            WHERE entidad = $1
            GROUP BY periodo
            ORDER BY periodo ASC;
        `, { bind: [entityName] });

        if (historyRows.length === 0) {
            return res.status(404).json({ success: false, error: `Institución '${entityName}' no encontrada en registros de la SB.` });
        }

        // Distribución por persona (último período)
        const [personDist] = await sequelize.query(`
            SELECT
                persona,
                SUM(balance) as balance,
                SUM(cantidad_instrumentos) as instruments
            FROM public.sb_banking_metrics
            WHERE entidad = $1 AND periodo = $2
            GROUP BY persona;
        `, { bind: [entityName, latestPeriod] });

        // Distribución geográfica por provincia (Top 10)
        const [geoDist] = await sequelize.query(`
            SELECT
                provincia,
                region,
                SUM(balance) as balance,
                SUM(cantidad_instrumentos) as instruments
            FROM public.sb_banking_metrics
            WHERE entidad = $1 AND periodo = $2
            GROUP BY provincia, region
            ORDER BY balance DESC
            LIMIT 10;
        `, { bind: [entityName, latestPeriod] });

        // Tasas por divisa en el último período
        const [yieldsByCurrency] = await sequelize.query(`
            SELECT
                currency_iso,
                SUM(balance) as balance,
                CASE WHEN SUM(balance) > 0
                     THEN ROUND((SUM(tasa_ponderada_balance) / SUM(balance))::numeric, 4)
                     ELSE 0 END as weighted_yield_pct
            FROM public.sb_banking_metrics
            WHERE entidad = $1 AND periodo = $2
            GROUP BY currency_iso;
        `, { bind: [entityName, latestPeriod] });

        const latestRecord = historyRows[historyRows.length - 1];

        res.json({
            success: true,
            entidad: entityName,
            periodo: latestPeriod,
            currentBalance: parseFloat(latestRecord.total_balance),
            currentInstruments: parseInt(latestRecord.total_instruments, 10),
            currentWeightedYieldPct: parseFloat(latestRecord.weighted_yield_pct),
            yieldsByCurrency: yieldsByCurrency.map(y => ({
                currency: y.currency_iso,
                balance: parseFloat(y.balance),
                weightedYieldPct: parseFloat(y.weighted_yield_pct)
            })),
            history: historyRows.map(h => ({
                periodo: h.periodo,
                totalBalance: parseFloat(h.total_balance),
                balanceDop: parseFloat(h.balance_dop),
                balanceUsd: parseFloat(h.balance_usd),
                balanceEur: parseFloat(h.balance_eur),
                instruments: parseInt(h.total_instruments, 10),
                weightedYieldPct: parseFloat(h.weighted_yield_pct)
            })),
            personDistribution: personDist.map(p => ({
                persona: p.persona,
                balance: parseFloat(p.balance),
                instruments: parseInt(p.instruments, 10)
            })),
            provinceDistribution: geoDist.map(g => ({
                provincia: g.provincia,
                region: g.region,
                balance: parseFloat(g.balance),
                instruments: parseInt(g.instruments, 10)
            }))
        });

    } catch (error) {
        console.error('[SB_CONTROLLER] Error en getBankingInstitution:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 6. Histórico Agregado del Sistema Bancario
 * GET /api/markets/banking/history
 */
export const getBankingHistory = async (req, res) => {
    try {
        const [rows] = await sequelize.query(`
            SELECT
                periodo,
                COUNT(DISTINCT entidad) as total_entities,
                SUM(balance) as total_balance,
                SUM(cantidad_instrumentos) as total_instruments,
                ROUND((SUM(tasa_ponderada_balance) / NULLIF(SUM(balance), 0))::numeric, 4) as system_weighted_yield_pct,
                ROUND((SUM(CASE WHEN currency_iso = 'DOP' THEN tasa_ponderada_balance ELSE 0 END) / NULLIF(SUM(CASE WHEN currency_iso = 'DOP' THEN balance ELSE 0 END), 0))::numeric, 4) as dop_yield_pct,
                ROUND((SUM(CASE WHEN currency_iso = 'USD' THEN tasa_ponderada_balance ELSE 0 END) / NULLIF(SUM(CASE WHEN currency_iso = 'USD' THEN balance ELSE 0 END), 0))::numeric, 4) as usd_yield_pct
            FROM public.sb_banking_metrics
            GROUP BY periodo
            ORDER BY periodo ASC;
        `);

        res.json({
            success: true,
            totalPeriods: rows.length,
            data: rows.map(r => ({
                periodo: r.periodo,
                totalEntities: parseInt(r.total_entities, 10),
                totalBalance: parseFloat(r.total_balance),
                totalInstruments: parseInt(r.total_instruments, 10),
                systemWeightedYieldPct: parseFloat(r.system_weighted_yield_pct || '0'),
                dopYieldPct: parseFloat(r.dop_yield_pct || '0'),
                usdYieldPct: parseFloat(r.usd_yield_pct || '0')
            }))
        });
    } catch (error) {
        console.error('[SB_CONTROLLER] Error en getBankingHistory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 7. Distribución Geográfica Provincial del Sistema Bancario
 * GET /api/markets/banking/provinces
 */
export const getBankingProvinces = async (req, res) => {
    try {
        const targetPeriod = req.query.period || await getLatestPeriod();
        if (!targetPeriod) return res.json({ success: true, data: [] });

        const cacheKey = `provinces_${targetPeriod}`;
        const cached = getCached(cacheKey);
        if (cached && req.query.refresh !== 'true') {
            return res.json({ success: true, cached: true, data: cached });
        }

        const [rows] = await sequelize.query(`
            WITH totals AS (
                SELECT SUM(balance) as system_total FROM public.sb_banking_metrics WHERE periodo = $1
            )
            SELECT
                m.provincia,
                m.region,
                SUM(m.balance) as total_balance,
                SUM(m.cantidad_instrumentos) as total_instruments,
                ROUND((SUM(m.balance) / t.system_total * 100)::numeric, 4) as market_share_pct,
                SUM(CASE WHEN m.persona = 'Persona física' THEN m.balance ELSE 0 END) as balance_fisica,
                SUM(CASE WHEN m.persona = 'Persona jurídica' THEN m.balance ELSE 0 END) as balance_juridica,
                SUM(CASE WHEN m.currency_iso = 'DOP' THEN m.balance ELSE 0 END) as balance_dop,
                SUM(CASE WHEN m.currency_iso = 'USD' THEN m.balance ELSE 0 END) as balance_usd,
                SUM(CASE WHEN m.currency_iso = 'EUR' THEN m.balance ELSE 0 END) as balance_eur
            FROM public.sb_banking_metrics m
            CROSS JOIN totals t
            WHERE m.periodo = $1
            GROUP BY m.provincia, m.region, t.system_total
            ORDER BY total_balance DESC;
        `, { bind: [targetPeriod] });

        const results = rows.map((r, index) => {
            const dop = parseFloat(r.balance_dop) || 0;
            const usd = parseFloat(r.balance_usd) || 0;
            const eur = parseFloat(r.balance_eur) || 0;
            let predominantCurrency = 'DOP';
            if (usd > dop && usd > eur) predominantCurrency = 'USD';
            else if (eur > dop && eur > usd) predominantCurrency = 'EUR';

            return {
                rank: index + 1,
                provincia: r.provincia,
                region: r.region,
                totalBalance: parseFloat(r.total_balance),
                totalInstruments: parseInt(r.total_instruments, 10),
                marketSharePct: parseFloat(r.market_share_pct),
                balanceFisica: parseFloat(r.balance_fisica),
                balanceJuridica: parseFloat(r.balance_juridica),
                balanceDop: dop,
                balanceUsd: usd,
                balanceEur: eur,
                predominantCurrency
            };
        });

        setCache(cacheKey, results);
        res.json({ success: true, cached: false, periodo: targetPeriod, data: results });

    } catch (error) {
        console.error('[SB_CONTROLLER] Error en getBankingProvinces:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 8. Estado de Sincronización y Telemetría
 * GET /api/markets/banking/sync-status
 */
export const getBankingSyncStatus = async (req, res) => {
    try {
        const status = await sbStatisticsService.getSbSyncStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        console.error('[SB_CONTROLLER] Error en getBankingSyncStatus:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * 8. Disparador Manual de Sincronización (Operador / Admin)
 * POST /api/markets/banking/sync
 */
export const handleTriggerSync = async (req, res) => {
    const audit = {
        user: req.user?.username || 'unknown',
        requestedPeriod: req.body?.period || 'LATEST_AVAILABLE',
        triggeredAt: new Date().toISOString(),
        source: 'manual_api'
    };
    try {
        const { period } = req.body || {};
        if (period) {
            const syncResult = await sbStatisticsService.syncSbMonth(period, { audit });
            memoryCache.clear();
            console.info('[SB_SYNC_AUDIT]', JSON.stringify({ ...audit, result: syncResult.status }));
            return res.json({ success: true, message: `Período ${period} sincronizado`, data: syncResult });
        }

        const latestCheck = await sbStatisticsService.syncLatestSbPeriod({ audit });
        memoryCache.clear();
        console.info('[SB_SYNC_AUDIT]', JSON.stringify({ ...audit, result: latestCheck.action }));
        res.json({ success: true, message: latestCheck.message, data: latestCheck });

    } catch (error) {
        console.warn('[SB_SYNC_AUDIT]', JSON.stringify({ ...audit, result: 'FAILED', error: error.message }));
        console.error('[SB_CONTROLLER] Error en handleTriggerSync:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
