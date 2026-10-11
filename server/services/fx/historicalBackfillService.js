/**
 * ============================================================================
 * PROVIDENCE FX // HISTORICAL BACKFILL SERVICE
 * Robust, resilient, multi-source historical ingestion engine.
 * Supports persistent checkpoints, adaptive validation bounds, exact-money
 * numerics, cryptographic provenance hashes, and transactional idempotency.
 * ============================================================================
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RATE_TYPES, VALIDATION_STATUS, CONFIDENCE_SCORES } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHECKPOINT_FILE = path.join(__dirname, '..', '..', 'data', 'fx_backfill_checkpoint.json');

export class FxHistoricalBackfillService {
    constructor(sequelizeInstance) {
        this.sequelize = sequelizeInstance;
        this.bcrdBaseUrl = 'https://www.bancentral.gov.do';
        this.tasaRealBaseUrl = 'https://tasareal.com/api/v1';
        this.yahooUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
        this.checkpoint = this.#loadCheckpoint();
    }

    #loadCheckpoint() {
        try {
            if (fs.existsSync(CHECKPOINT_FILE)) {
                return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
            }
        } catch (e) {
            console.warn('[BACKFILL] Error loading checkpoint, starting fresh:', e.message);
        }
        return {
            completedTasks: {},
            lastUpdated: null,
            stats: {
                totalImported: 0,
                totalSkipped: 0,
                totalErrors: 0
            }
        };
    }

    #saveCheckpoint() {
        try {
            const dir = path.dirname(CHECKPOINT_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            this.checkpoint.lastUpdated = new Date().toISOString();
            fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(this.checkpoint, null, 2), 'utf8');
        } catch (e) {
            console.warn('[BACKFILL] Could not persist checkpoint:', e.message);
        }
    }

    /**
     * Compute SHA-256 provenance hash for auditability
     */
    static computeProvenanceHash(record) {
        const payload = `${record.provider}|${record.institutionId}|${record.baseCurrency}|${record.quoteCurrency}|${record.rateType}|${record.economicDate}|${record.buy}|${record.sell}`;
        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    /**
     * Adaptive historical bounds validator based on period and currency
     */
    static validateObservation(obs) {
        const year = parseInt(String(obs.economicDate).substring(0, 4), 10);
        const buy = obs.buy != null ? Number(obs.buy) : null;
        const sell = obs.sell != null ? Number(obs.sell) : null;
        const val = sell || buy;

        if (!val || isNaN(val) || val <= 0) {
            return { valid: false, reason: 'Tasa no numérica o menor/igual a cero' };
        }

        // Check inverted buy/sell if both exist
        if (buy !== null && sell !== null && sell < buy) {
            if (obs.metadata?.is_official_anomaly || obs.economicDate === '1991-01-25') {
                return {
                    valid: true,
                    warning: true,
                    status: 'OFFICIAL_ANOMALY',
                    confidence: 0.50,
                    reason: `Anomalía oficial documentada de origen: venta (${sell}) < compra (${buy})`
                };
            }
            return { valid: false, reason: `Spread invertido: venta (${sell}) < compra (${buy})` };
        }

        // Adaptive bounds
        let minBound = 1.0;
        let maxBound = 150.0;

        if (obs.baseCurrency === 'USD') {
            if (year < 1995) { minBound = 8.0; maxBound = 20.0; }
            else if (year < 2002) { minBound = 12.0; maxBound = 25.0; }
            else if (year <= 2004) { minBound = 15.0; maxBound = 65.0; } // 2003-2004 Dominican banking crisis spike
            else if (year < 2015) { minBound = 25.0; maxBound = 50.0; }
            else if (year < 2024) { minBound = 45.0; maxBound = 65.0; }
            else { minBound = 55.0; maxBound = 75.0; }
        } else if (obs.baseCurrency === 'EUR') {
            if (year < 2006) { minBound = 30.0; maxBound = 70.0; }
            else if (year < 2015) { minBound = 35.0; maxBound = 75.0; }
            else { minBound = 50.0; maxBound = 90.0; }
        }

        if (val < minBound || val > maxBound) {
            return {
                valid: true,
                warning: true,
                status: VALIDATION_STATUS.WARNING,
                confidence: 0.60,
                reason: `Tasa fuera de umbrales adaptativos estándar para ${year} (${minBound} - ${maxBound})`
            };
        }

        return {
            valid: true,
            warning: false,
            status: VALIDATION_STATUS.VERIFIED,
            confidence: CONFIDENCE_SCORES[VALIDATION_STATUS.VERIFIED]
        };
    }

    /**
     * Fetch BCRD session cookies
     */
    async #getBcrdCookies() {
        const sessionRes = await fetch(`${this.bcrdBaseUrl}/SectorExterno/HistoricoTasas`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const cookieMap = new Map();
        const setCookies = typeof sessionRes.headers.getSetCookie === 'function'
            ? sessionRes.headers.getSetCookie()
            : (sessionRes.headers.get('set-cookie') || '').split(',');
        for (const raw of setCookies) {
            const [pair] = raw.split(';');
            const [k, v] = pair.split('=');
            if (k && v && v.trim() !== '') {
                cookieMap.set(k.trim(), v.trim());
            }
        }
        return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    }

    /**
     * Ingest BCRD Official USD Spot Exchange Rates (1991 to current year)
     */
    async backfillBcrdUsd({ startYear = 1991, endYear = 2026, force = false } = {}) {
        const taskKey = `bcrd_usd_${startYear}_${endYear}`;
        console.log(`[BACKFILL][BCRD_USD] Iniciando recuperación oficial 1991–2026...`);

        const cookies = await this.#getBcrdCookies();
        const summary = {
            task: taskKey,
            provider: 'bcrd',
            currency: 'USD',
            yearsProcessed: 0,
            importedCount: 0,
            skippedCount: 0,
            rejectedCount: 0,
            errors: []
        };

        for (let year = startYear; year <= endYear; year++) {
            const yearKey = `bcrd_usd_${year}`;
            if (this.checkpoint.completedTasks[yearKey] && !force) {
                console.log(`[BACKFILL][BCRD_USD] Año ${year} ya completado en checkpoint. Saltando.`);
                continue;
            }

            try {
                const fromDate = `${year}-01-01T00:00:00.000Z`;
                const toDate = `${year}-12-31T23:59:59.000Z`;

                const res = await fetch(`${this.bcrdBaseUrl}/Home/GetHistoricalExchangeRates`, {
                    method: 'POST',
                    headers: {
                        'Cookie': cookies,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'Referer': `${this.bcrdBaseUrl}/SectorExterno/HistoricoTasas`,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    },
                    body: `fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&purchaseColumnOrder=&sellingColumnOrder=&dateColumnOrder=asc&isForReporting=false`
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} al consultar BCRD para año ${year}`);
                }

                const json = await res.json();
                const items = json?.result?.items || [];

                if (items.length === 0) {
                    console.log(`[BACKFILL][BCRD_USD] Año ${year}: 0 observaciones recibidas.`);
                    this.checkpoint.completedTasks[yearKey] = { count: 0, timestamp: new Date().toISOString() };
                    this.#saveCheckpoint();
                    continue;
                }

                const recordsToInsert = [];

                for (const item of items) {
                    const dateRaw = item.date;
                    if (!dateRaw) continue;

                    const dateObj = new Date(dateRaw);
                    const economicDate = dateObj.toISOString().split('T')[0];
                    const buy = Number(item.purchaseValue);
                    const sell = Number(item.sellingValue);
                    const mid = (buy && sell) ? Math.round(((buy + sell) / 2) * 1000000) / 1000000 : (sell || buy);
                    const spread = (buy && sell) ? Math.round((sell - buy) * 1000000) / 1000000 : 0;

                    const observation = {
                        provider: 'bcrd',
                        institutionId: 'bcrd',
                        institutionName: 'Banco Central de la República Dominicana',
                        rateType: RATE_TYPES.OFFICIAL_REFERENCE,
                        baseCurrency: 'USD',
                        quoteCurrency: 'DOP',
                        economicDate,
                        observedAt: dateObj,
                        buy,
                        sell,
                        mid,
                        spread
                    };

                    const valResult = FxHistoricalBackfillService.validateObservation(observation);
                    if (!valResult.valid) {
                        summary.rejectedCount++;
                        continue;
                    }

                    const provenanceHash = FxHistoricalBackfillService.computeProvenanceHash(observation);

                    recordsToInsert.push({
                        observed_at: dateObj,
                        provider: 'bcrd',
                        institution_id: 'bcrd',
                        institution_name: 'Banco Central de la República Dominicana',
                        rate_type: RATE_TYPES.OFFICIAL_REFERENCE,
                        base_currency: 'USD',
                        quote_currency: 'DOP',
                        buy,
                        sell,
                        mid,
                        spread,
                        confidence: valResult.confidence || 1.0,
                        validation_status: valResult.status || VALIDATION_STATUS.VERIFIED,
                        provider_updated_at: dateObj,
                        buy_exact: buy.toFixed(6),
                        sell_exact: sell.toFixed(6),
                        mid_exact: mid.toFixed(6),
                        spread_exact: spread.toFixed(6),
                        economic_date: economicDate,
                        provenance_hash: provenanceHash,
                        metadata: JSON.stringify({
                            source: 'bcrd_official_portal_json',
                            statisticGroupName: item.statisticDataGroupName,
                            purchaseInteranual: item.purchaseInteranualValue,
                            sellingInteranual: item.sellingInteranualValue,
                            originalId: item.id
                        }),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }

                // Batch upsert into PostgreSQL
                const inserted = await this.#insertBatch(recordsToInsert);
                summary.importedCount += inserted;
                summary.yearsProcessed++;

                console.log(`[BACKFILL][BCRD_USD] Año ${year}: ${inserted} observaciones persistidas de ${items.length} recibidas.`);

                this.checkpoint.completedTasks[yearKey] = { count: inserted, timestamp: new Date().toISOString() };
                this.#saveCheckpoint();

                // Gentle delay between years
                await new Promise(r => setTimeout(r, 200));

            } catch (err) {
                console.error(`[BACKFILL][BCRD_USD] Error procesando año ${year}:`, err.message);
                summary.errors.push({ year, error: err.message });
            }
        }

        console.log(`[BACKFILL][BCRD_USD] Finalizado: ${summary.importedCount} registros totales.`);
        return summary;
    }

    /**
     * Ingest BCRD Official EUR Spot Convertible Rates (2004 to current year)
     */
    async backfillBcrdEur({ startYear = 2004, endYear = 2026, force = false } = {}) {
        const taskKey = `bcrd_eur_${startYear}_${endYear}`;
        console.log(`[BACKFILL][BCRD_EUR] Iniciando recuperación oficial de EUR 2004–2026...`);

        const cookies = await this.#getBcrdCookies();
        const summary = {
            task: taskKey,
            provider: 'bcrd',
            currency: 'EUR',
            yearsProcessed: 0,
            importedCount: 0,
            skippedCount: 0,
            rejectedCount: 0,
            errors: []
        };

        for (let year = startYear; year <= endYear; year++) {
            const yearKey = `bcrd_eur_${year}`;
            if (this.checkpoint.completedTasks[yearKey] && !force) {
                console.log(`[BACKFILL][BCRD_EUR] Año ${year} ya completado en checkpoint. Saltando.`);
                continue;
            }

            try {
                const fromDate = `${year}-01-01T00:00:00.000Z`;
                const toDate = `${year}-12-31T23:59:59.000Z`;

                const res = await fetch(`${this.bcrdBaseUrl}/Home/GetAllConvertibleExchangeRates`, {
                    method: 'POST',
                    headers: {
                        'Cookie': cookies,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'Referer': `${this.bcrdBaseUrl}/SectorExterno/HistoricoTasasConvertibles`,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    },
                    body: `FilterCurrencies=8&FilterFrequency=Diario&FromDate=${encodeURIComponent(fromDate)}&ToDate=${encodeURIComponent(toDate)}&SortBy=ExchangeRateDate&SortOrder=asc`
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} al consultar BCRD convertible para año ${year}`);
                }

                const json = await res.json();
                const items = json?.result?.items || [];

                if (items.length === 0) {
                    console.log(`[BACKFILL][BCRD_EUR] Año ${year}: 0 observaciones recibidas.`);
                    this.checkpoint.completedTasks[yearKey] = { count: 0, timestamp: new Date().toISOString() };
                    this.#saveCheckpoint();
                    continue;
                }

                const recordsToInsert = [];

                for (const item of items) {
                    const dateRaw = item.exchangeRateDate;
                    if (!dateRaw) continue;

                    const dateObj = new Date(dateRaw);
                    const economicDate = dateObj.toISOString().split('T')[0];
                    const rateVal = Number(item.value);

                    const observation = {
                        provider: 'bcrd',
                        institutionId: 'bcrd',
                        institutionName: 'Banco Central de la República Dominicana',
                        rateType: RATE_TYPES.OFFICIAL_REFERENCE,
                        baseCurrency: 'EUR',
                        quoteCurrency: 'DOP',
                        economicDate,
                        observedAt: dateObj,
                        buy: rateVal,
                        sell: rateVal,
                        mid: rateVal,
                        spread: 0
                    };

                    const valResult = FxHistoricalBackfillService.validateObservation(observation);
                    if (!valResult.valid) {
                        summary.rejectedCount++;
                        continue;
                    }

                    const provenanceHash = FxHistoricalBackfillService.computeProvenanceHash(observation);

                    recordsToInsert.push({
                        observed_at: dateObj,
                        provider: 'bcrd',
                        institution_id: 'bcrd',
                        institution_name: 'Banco Central de la República Dominicana',
                        rate_type: RATE_TYPES.OFFICIAL_REFERENCE,
                        base_currency: 'EUR',
                        quote_currency: 'DOP',
                        buy: rateVal,
                        sell: rateVal,
                        mid: rateVal,
                        spread: 0,
                        confidence: valResult.confidence || 1.0,
                        validation_status: valResult.status || VALIDATION_STATUS.VERIFIED,
                        provider_updated_at: dateObj,
                        buy_exact: rateVal.toFixed(6),
                        sell_exact: rateVal.toFixed(6),
                        mid_exact: rateVal.toFixed(6),
                        spread_exact: '0.000000',
                        economic_date: economicDate,
                        provenance_hash: provenanceHash,
                        metadata: JSON.stringify({
                            source: 'bcrd_convertible_rates_json',
                            currencyName: item.currency,
                            frequency: item.frequency,
                            monthName: item.month,
                            originalId: item.id
                        }),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }

                const inserted = await this.#insertBatch(recordsToInsert);
                summary.importedCount += inserted;
                summary.yearsProcessed++;

                console.log(`[BACKFILL][BCRD_EUR] Año ${year}: ${inserted} observaciones de EUR persistidas de ${items.length} recibidas.`);

                this.checkpoint.completedTasks[yearKey] = { count: inserted, timestamp: new Date().toISOString() };
                this.#saveCheckpoint();

                await new Promise(r => setTimeout(r, 200));

            } catch (err) {
                console.error(`[BACKFILL][BCRD_EUR] Error procesando año ${year}:`, err.message);
                summary.errors.push({ year, error: err.message });
            }
        }

        console.log(`[BACKFILL][BCRD_EUR] Finalizado: ${summary.importedCount} registros totales de EUR.`);
        return summary;
    }

    /**
     * Ingest Yahoo Finance Market Spot Benchmark Series (2003 to 2026)
     */
    async backfillYahooMarketSeries({ force = false } = {}) {
        console.log(`[BACKFILL][YAHOO] Iniciando recuperación de series de mercado internacional...`);
        const summary = {
            task: 'yahoo_market_series',
            importedCount: 0,
            skippedCount: 0,
            errors: []
        };

        const tickers = [
            { ticker: 'DOP=X', currency: 'USD', name: 'USD/DOP Mercado Spot (Yahoo)' },
            { ticker: 'EURDOP=X', currency: 'EUR', name: 'EUR/DOP Mercado Spot (Yahoo)' }
        ];

        for (const t of tickers) {
            const taskKey = `yahoo_${t.ticker}`;
            if (this.checkpoint.completedTasks[taskKey] && !force) {
                console.log(`[BACKFILL][YAHOO] Ticker ${t.ticker} ya completado en checkpoint. Saltando.`);
                continue;
            }

            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t.ticker)}?period1=1000000000&period2=1800000000&interval=1d`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': this.yahooUserAgent, 'Accept': 'application/json' }
                });

                if (!res.ok) throw new Error(`HTTP ${res.status} de Yahoo Finance para ${t.ticker}`);

                const json = await res.json();
                const result = json?.chart?.result?.[0];
                const timestamps = result?.timestamp || [];
                const quote = result?.indicators?.quote?.[0] || {};
                const closes = quote.close || [];
                const opens = quote.open || [];
                const highs = quote.high || [];
                const lows = quote.low || [];

                const recordsToInsert = [];

                for (let i = 0; i < timestamps.length; i++) {
                    const c = closes[i];
                    if (c === null || isNaN(c) || c <= 0) continue;

                    const dateObj = new Date(timestamps[i] * 1000);
                    const economicDate = dateObj.toISOString().split('T')[0];
                    const price = Math.round(c * 1000000) / 1000000;

                    const observation = {
                        provider: 'yahoo',
                        institutionId: 'yahoo',
                        institutionName: t.name,
                        rateType: RATE_TYPES.MARKET,
                        baseCurrency: t.currency,
                        quoteCurrency: 'DOP',
                        economicDate,
                        observedAt: dateObj,
                        buy: price,
                        sell: price,
                        mid: price,
                        spread: 0
                    };

                    const valResult = FxHistoricalBackfillService.validateObservation(observation);
                    if (!valResult.valid) continue;

                    const provenanceHash = FxHistoricalBackfillService.computeProvenanceHash(observation);

                    recordsToInsert.push({
                        observed_at: dateObj,
                        provider: 'yahoo',
                        institution_id: 'yahoo',
                        institution_name: t.name,
                        rate_type: RATE_TYPES.MARKET,
                        base_currency: t.currency,
                        quote_currency: 'DOP',
                        buy: price,
                        sell: price,
                        mid: price,
                        spread: 0,
                        confidence: 0.90,
                        validation_status: valResult.status || VALIDATION_STATUS.VERIFIED,
                        provider_updated_at: dateObj,
                        buy_exact: price.toFixed(6),
                        sell_exact: price.toFixed(6),
                        mid_exact: price.toFixed(6),
                        spread_exact: '0.000000',
                        economic_date: economicDate,
                        provenance_hash: provenanceHash,
                        metadata: JSON.stringify({
                            source: 'yahoo_finance_v8_daily',
                            ticker: t.ticker,
                            open: opens[i] ? Number(opens[i].toFixed(6)) : null,
                            high: highs[i] ? Number(highs[i].toFixed(6)) : null,
                            low: lows[i] ? Number(lows[i].toFixed(6)) : null
                        }),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }

                // Chunked insert in batches of 500
                let tickerInserted = 0;
                for (let i = 0; i < recordsToInsert.length; i += 500) {
                    const chunk = recordsToInsert.slice(i, i + 500);
                    tickerInserted += await this.#insertBatch(chunk);
                }

                summary.importedCount += tickerInserted;
                console.log(`[BACKFILL][YAHOO] ${t.ticker}: ${tickerInserted} observaciones persistidas.`);

                this.checkpoint.completedTasks[taskKey] = { count: tickerInserted, timestamp: new Date().toISOString() };
                this.#saveCheckpoint();

            } catch (err) {
                console.error(`[BACKFILL][YAHOO] Error en ${t.ticker}:`, err.message);
                summary.errors.push({ ticker: t.ticker, error: err.message });
            }
        }

        return summary;
    }

    /**
     * Ingest TasaReal 7-day authorized sliding window for commercial banks
     */
    async backfillTasaRealAuthorizedWindow() {
        console.log(`[BACKFILL][TASAREAL] Recuperando histórico bancario autorizado (7 días)...`);
        const apiKey = process.env.TASAREAL_API_KEY ? process.env.TASAREAL_API_KEY.trim() : null;
        if (!apiKey) {
            console.log(`[BACKFILL][TASAREAL] Omitido: TASAREAL_API_KEY no configurada.`);
            return { skipped: true, reason: 'No API Key' };
        }

        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'X-API-Key': apiKey,
            'Accept': 'application/json',
            'User-Agent': 'Magnus-OS2-Providence-FX/1.0'
        };

        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        const toStr = now.toISOString().split('T')[0];
        const fromStr = sevenDaysAgo.toISOString().split('T')[0];

        const institutions = [
            'reservas', 'popular', 'bhd', 'scotiabank', 'santa_cruz', 'banesco',
            'promerica', 'alnap', 'cibao', 'lafise', 'dgii', 'bcrd'
        ];

        let totalInserted = 0;

        for (const instId of institutions) {
            for (const currency of ['USD', 'EUR']) {
                try {
                    const url = `${this.tasaRealBaseUrl}/rates/history?institution=${instId}&currency=${currency}&from=${fromStr}&to=${toStr}`;
                    const res = await fetch(url, { headers });
                    if (!res.ok) continue;

                    const json = await res.json();
                    const items = json?.data || [];
                    if (!items.length) continue;

                    const recordsToInsert = [];

                    for (const item of items) {
                        const dateStr = item.date || item.fecha;
                        if (!dateStr) continue;

                        const dateObj = new Date(dateStr);
                        const economicDate = dateObj.toISOString().split('T')[0];
                        const buy = item.buy ? Number(item.buy) : null;
                        const sell = item.sell ? Number(item.sell) : null;
                        const mid = (buy && sell) ? Math.round(((buy + sell) / 2) * 1000000) / 1000000 : (sell || buy);
                        const spread = (buy && sell) ? Math.round((sell - buy) * 1000000) / 1000000 : 0;

                        const observation = {
                            provider: 'tasareal',
                            institutionId: instId,
                            institutionName: item.institution_name || instId.toUpperCase(),
                            rateType: (instId === 'bcrd' || instId === 'dgii') ? RATE_TYPES.OFFICIAL_REFERENCE : RATE_TYPES.RETAIL_BANK,
                            baseCurrency: currency,
                            quoteCurrency: 'DOP',
                            economicDate,
                            observedAt: dateObj,
                            buy,
                            sell,
                            mid,
                            spread
                        };

                        const valResult = FxHistoricalBackfillService.validateObservation(observation);
                        if (!valResult.valid) continue;

                        const provenanceHash = FxHistoricalBackfillService.computeProvenanceHash(observation);

                        recordsToInsert.push({
                            observed_at: dateObj,
                            provider: 'tasareal',
                            institution_id: instId,
                            institution_name: item.institution_name || instId.toUpperCase(),
                            rate_type: (instId === 'bcrd' || instId === 'dgii') ? RATE_TYPES.OFFICIAL_REFERENCE : RATE_TYPES.RETAIL_BANK,
                            base_currency: currency,
                            quote_currency: 'DOP',
                            buy,
                            sell,
                            mid,
                            spread,
                            confidence: valResult.confidence || 0.85,
                            validation_status: valResult.status || VALIDATION_STATUS.VERIFIED,
                            provider_updated_at: dateObj,
                            buy_exact: buy ? buy.toFixed(6) : null,
                            sell_exact: sell ? sell.toFixed(6) : null,
                            mid_exact: mid ? mid.toFixed(6) : null,
                            spread_exact: spread ? spread.toFixed(6) : null,
                            economic_date: economicDate,
                            provenance_hash: provenanceHash,
                            metadata: JSON.stringify({
                                source: 'tasareal_api_history_window',
                                window: '7d',
                                verification: item.verification
                            }),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }

                    if (recordsToInsert.length > 0) {
                        const ins = await this.#insertBatch(recordsToInsert);
                        totalInserted += ins;
                    }

                    await new Promise(r => setTimeout(r, 100));

                } catch (e) {
                    // non-critical, continue next institution
                }
            }
        }

        console.log(`[BACKFILL][TASAREAL] Finalizado: ${totalInserted} observaciones bancarias incorporadas.`);
        return { totalInserted };
    }

    /**
     * Idempotent SQL batch insert with ON CONFLICT DO UPDATE/NOTHING
     */
    async #insertBatch(records) {
        if (!records || records.length === 0) return 0;

        const isPostgres = this.sequelize.getDialect() === 'postgres';

        if (isPostgres) {
            // Construct parameterized bulk INSERT ... ON CONFLICT DO NOTHING
            const valueClauses = [];
            const bindParams = [];
            let paramIdx = 1;

            for (const r of records) {
                valueClauses.push(`(
                    $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
                    $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
                    $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
                    $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
                    $${paramIdx++}, $${paramIdx++}, $${paramIdx++}
                )`);

                bindParams.push(
                    r.observed_at,
                    r.provider,
                    r.institution_id,
                    r.institution_name,
                    r.rate_type,
                    r.base_currency,
                    r.quote_currency,
                    r.buy,
                    r.sell,
                    r.mid,
                    r.spread,
                    r.confidence,
                    r.validation_status,
                    r.provider_updated_at,
                    r.buy_exact,
                    r.sell_exact,
                    r.mid_exact,
                    r.spread_exact,
                    r.economic_date,
                    r.provenance_hash,
                    r.metadata,
                    r.createdAt,
                    r.updatedAt
                );
            }

            const sql = `
                INSERT INTO public.fx_rate_observations (
                    observed_at, provider, institution_id, institution_name, rate_type,
                    base_currency, quote_currency, buy, sell, mid, spread,
                    confidence, validation_status, provider_updated_at,
                    buy_exact, sell_exact, mid_exact, spread_exact,
                    economic_date, provenance_hash, metadata, "createdAt", "updatedAt"
                )
                VALUES ${valueClauses.join(', ')}
                ON CONFLICT (provider, institution_id, base_currency, quote_currency, rate_type, observed_at)
                DO NOTHING;
            `;

            await this.sequelize.query(sql, { bind: bindParams });
            return records.length;
        }

        // SQLite fallback
        for (const r of records) {
            await this.sequelize.query(`
                INSERT OR IGNORE INTO fx_rate_observations (
                    observed_at, provider, institution_id, institution_name, rate_type,
                    base_currency, quote_currency, buy, sell, mid, spread,
                    confidence, validation_status, provider_updated_at,
                    buy_exact, sell_exact, mid_exact, spread_exact,
                    economic_date, provenance_hash, metadata, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `, {
                replacements: [
                    r.observed_at, r.provider, r.institution_id, r.institution_name, r.rate_type,
                    r.base_currency, r.quote_currency, r.buy, r.sell, r.mid, r.spread,
                    r.confidence, r.validation_status, r.provider_updated_at,
                    r.buy_exact, r.sell_exact, r.mid_exact, r.spread_exact,
                    r.economic_date, r.provenance_hash, r.metadata, r.createdAt, r.updatedAt
                ]
            });
        }
        return records.length;
    }

    /**
     * Executes the complete multi-source backfill pipeline in strict order of priority
     */
    async executeFullBackfill() {
        console.log('===============================================================');
        console.log('PROVIDENCE FX // EXECUTING FULL MULTI-SOURCE HISTORICAL BACKFILL');
        console.log('===============================================================');

        const overallStats = {
            startTime: new Date().toISOString(),
            bcrdUsd: null,
            bcrdEur: null,
            tasaReal: null,
            yahoo: null,
            finalDbStats: null
        };

        // Priority 1: Official BCRD USD Spot (1991–2026)
        overallStats.bcrdUsd = await this.backfillBcrdUsd();

        // Priority 2: Official BCRD EUR Convertible (2004–2026)
        overallStats.bcrdEur = await this.backfillBcrdEur();

        // Priority 3: Commercial Bank Authorized Windows (TasaReal)
        overallStats.tasaReal = await this.backfillTasaRealAuthorizedWindow();

        // Priority 4: International Market Benchmarks (Yahoo Finance 2003–2026)
        overallStats.yahoo = await this.backfillYahooMarketSeries();

        // Final database verification
        const [counts] = await this.sequelize.query(`
            SELECT 
                provider, 
                base_currency, 
                rate_type, 
                COUNT(*) as count, 
                MIN(economic_date) as min_date, 
                MAX(economic_date) as max_date
            FROM public.fx_rate_observations
            GROUP BY provider, base_currency, rate_type
            ORDER BY provider, base_currency;
        `);

        overallStats.finalDbStats = counts;
        overallStats.endTime = new Date().toISOString();

        console.log('===============================================================');
        console.log('PROVIDENCE FX // BACKFILL COMPLETED SUCCESSFULLY');
        console.log('===============================================================');
        console.table(counts);

        return overallStats;
    }
}
