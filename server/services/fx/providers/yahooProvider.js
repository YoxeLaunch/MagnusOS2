/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // YAHOO FINANCE MARKET REFERENCE PROVIDER
 * Preserves existing Yahoo Finance telemetry as Global Market FX Reference
 * ============================================================================
 */

import { BaseFxProvider } from './baseProvider.js';
import { normalizeRateObservation } from '../normalizer.js';
import { RATE_TYPES } from '../types.js';

const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export class YahooProvider extends BaseFxProvider {
    constructor() {
        const isEnabled = process.env.YAHOO_ENABLED !== 'false';
        super({
            id: 'yahoo',
            name: 'Yahoo Finance (Mercado Interbancario Spot)',
            enabled: isEnabled
        });
    }

    /**
     * Consulta Yahoo Finance v8 chart para la moneda solicitada
     * @param {string} targetCurrency - 'USD' o 'EUR'
     * @returns {Promise<Array>}
     */
    async getRates(targetCurrency = 'USD') {
        const target = (targetCurrency || 'USD').toUpperCase();

        return this.executeWithProtection(async (signal) => {
            if (target === 'EUR') {
                // Para EUR consultamos tanto EURDOP=X como EURUSD=X (benchmark internacional)
                const fetchTicker = async (ticker) => {
                    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=5m`;
                    const res = await fetch(url, {
                        headers: { 'User-Agent': YAHOO_UA, 'Accept': 'application/json' },
                        signal
                    });
                    if (!res.ok) return null;
                    const json = await res.json();
                    return json?.chart?.result?.[0]?.meta || null;
                };

                const [eurDopMeta, eurUsdMeta] = await Promise.all([
                    fetchTicker('EURDOP=X'),
                    fetchTicker('EURUSD=X')
                ]);

                const eurUsdData = eurUsdMeta && typeof eurUsdMeta.regularMarketPrice === 'number' ? {
                    price: eurUsdMeta.regularMarketPrice,
                    prevClose: eurUsdMeta.chartPreviousClose || eurUsdMeta.regularMarketPrice,
                    change: eurUsdMeta.regularMarketPrice - (eurUsdMeta.chartPreviousClose || eurUsdMeta.regularMarketPrice),
                    changePercent: eurUsdMeta.chartPreviousClose ? ((eurUsdMeta.regularMarketPrice - eurUsdMeta.chartPreviousClose) / eurUsdMeta.chartPreviousClose) * 100 : 0,
                    symbol: 'EURUSD=X'
                } : null;

                const price = eurDopMeta?.regularMarketPrice || (eurUsdData ? eurUsdData.price * 60.0 : null);
                if (!price || typeof price !== 'number') {
                    throw new Error('Yahoo Finance no devolvió precio para EUR');
                }

                const prevClose = eurDopMeta?.chartPreviousClose || price;

                const normalized = normalizeRateObservation({
                    provider: this.id,
                    rawInstitution: 'Yahoo Finance',
                    buy: price,
                    sell: price,
                    baseCurrency: 'EUR',
                    quoteCurrency: 'DOP',
                    observedAt: new Date(),
                    providerUpdatedAt: eurDopMeta?.regularMarketTime ? new Date(eurDopMeta.regularMarketTime * 1000) : new Date(),
                    rateType: RATE_TYPES.MARKET,
                    metadata: {
                        prevClose,
                        change: price - prevClose,
                        changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
                        eurUsd: eurUsdData,
                        ticker: 'EURDOP=X'
                    }
                });

                return normalized ? [normalized] : [];
            }

            // Flujo USD estándar (DOP=X)
            const url = 'https://query1.finance.yahoo.com/v8/finance/chart/DOP=X?range=1d&interval=5m';
            const response = await fetch(url, {
                headers: {
                    'User-Agent': YAHOO_UA,
                    'Accept': 'application/json'
                },
                signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} de Yahoo Finance`);
            }

            const json = await response.json();
            const meta = json?.chart?.result?.[0]?.meta;
            if (!meta || typeof meta.regularMarketPrice !== 'number') {
                throw new Error('Yahoo Finance no devolvió precio regularMarketPrice para DOP=X');
            }

            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose || price;

            const normalized = normalizeRateObservation({
                provider: this.id,
                rawInstitution: 'Yahoo Finance',
                buy: price,
                sell: price,
                baseCurrency: 'USD',
                quoteCurrency: 'DOP',
                observedAt: new Date(),
                providerUpdatedAt: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date(),
                rateType: RATE_TYPES.MARKET,
                metadata: {
                    prevClose,
                    change: price - prevClose,
                    changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
                    ticker: 'DOP=X'
                }
            });

            return normalized ? [normalized] : [];
        });
    }
}
