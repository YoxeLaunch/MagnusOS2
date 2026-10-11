/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // BCRD OFFICIAL REFERENCE PROVIDER
 * Fetches the official spot exchange rate directly from the Central Bank of DR
 * with automated session handling and resilient fallback to community API.
 * ============================================================================
 */

import { BaseFxProvider } from './baseProvider.js';
import { normalizeRateObservation } from '../normalizer.js';
import { RATE_TYPES } from '../types.js';

export class BcrdProvider extends BaseFxProvider {
    constructor() {
        const isEnabled = process.env.BCRD_ENABLED !== 'false';
        super({
            id: 'bcrd',
            name: 'Banco Central de la República Dominicana (Oficial)',
            enabled: isEnabled
        });

        this.officialBaseUrl = 'https://www.bancentral.gov.do';
        this.fallbackApiUrl = 'https://api.dominicanaapi.com/v1/bcrd/tasa-cambio';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    }

    /**
     * Obtains official session cookies from BCRD portal
     */
    async #getCookies(signal) {
        const sessionRes = await fetch(`${this.officialBaseUrl}/SectorExterno/HistoricoTasas`, {
            headers: { 'User-Agent': this.userAgent },
            signal
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
     * Consulta la tasa oficial spot del BCRD
     * @param {string} targetCurrency - 'USD' o 'EUR'
     * @returns {Promise<Array>}
     */
    async getRates(targetCurrency = 'USD') {
        const target = (targetCurrency || 'USD').toUpperCase();

        return this.executeWithProtection(async (signal) => {
            // Intento 1: Consulta directa al portal oficial del BCRD
            try {
                const cookies = await this.#getCookies(signal);

                if (target === 'EUR') {
                    // Consulta EUR oficial convertible con ventana reciente
                    const now = new Date();
                    const windowStart = new Date();
                    windowStart.setDate(now.getDate() - 15);
                    const fromDate = windowStart.toISOString();
                    const toDate = now.toISOString();

                    const res = await fetch(`${this.officialBaseUrl}/Home/GetAllConvertibleExchangeRates`, {
                        method: 'POST',
                        headers: {
                            'Cookie': cookies,
                            'X-Requested-With': 'XMLHttpRequest',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Referer': `${this.officialBaseUrl}/SectorExterno/HistoricoTasasConvertibles`,
                            'User-Agent': this.userAgent
                        },
                        body: `FilterCurrencies=8&FilterFrequency=Diario&FromDate=${encodeURIComponent(fromDate)}&ToDate=${encodeURIComponent(toDate)}`,
                        signal
                    });

                    if (res.ok) {
                        const json = await res.json();
                        const items = json?.result?.items || [];
                        const latest = items.length ? items[items.length - 1] : null;
                        if (latest && typeof latest.value === 'number') {
                            const val = latest.value;
                            const dateVal = latest.exchangeRateDate;

                            const normalized = normalizeRateObservation({
                                provider: this.id,
                                rawInstitution: 'Banco Central de la República Dominicana',
                                buy: val,
                                sell: val,
                                baseCurrency: 'EUR',
                                quoteCurrency: 'DOP',
                                observedAt: new Date(),
                                providerUpdatedAt: dateVal ? new Date(dateVal) : new Date(),
                                rateType: RATE_TYPES.OFFICIAL_REFERENCE,
                                metadata: {
                                    source: 'bcrd_direct_convertible_eur',
                                    frequency: latest.frequency,
                                    day: latest.day,
                                    month: latest.month,
                                    year: latest.year
                                }
                            });
                            if (normalized) return [normalized];
                        }
                    }
                } else {
                    // Consulta USD oficial spot
                    const res = await fetch(`${this.officialBaseUrl}/Home/GetActualExchangeRate`, {
                        method: 'POST',
                        headers: {
                            'Cookie': cookies,
                            'X-Requested-With': 'XMLHttpRequest',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'Referer': `${this.officialBaseUrl}/SectorExterno/HistoricoTasas`,
                            'User-Agent': this.userAgent
                        },
                        signal
                    });

                    if (res.ok) {
                        const json = await res.json();
                        const result = json?.result;
                        const buyVal = result?.actualPurchaseValue;
                        const sellVal = result?.actualSellingValue;
                        const dateVal = result?.date;

                        if (buyVal && sellVal) {
                            const normalized = normalizeRateObservation({
                                provider: this.id,
                                rawInstitution: 'Banco Central de la República Dominicana',
                                buy: buyVal,
                                sell: sellVal,
                                baseCurrency: 'USD',
                                quoteCurrency: 'DOP',
                                observedAt: new Date(),
                                providerUpdatedAt: dateVal ? new Date(dateVal) : new Date(),
                                rateType: RATE_TYPES.OFFICIAL_REFERENCE,
                                metadata: {
                                    source: 'bcrd_direct_official_spot',
                                    purchaseInteranual: result.actualPurchaseInteranualValue,
                                    sellingInteranual: result.actualSellingInteranualValue
                                }
                            });
                            if (normalized) return [normalized];
                        }
                    }
                }
            } catch (directErr) {
                console.warn(`[FX][BCRD] Consulta directa a bancentral.gov.do no completada (${directErr.message}). Activando fallback a dominicanaapi.`);
            }

            // Intento 2: Fallback al intermediario api.dominicanaapi.com
            const fallbackUrl = target === 'EUR' ? `${this.fallbackApiUrl}?currency=EUR` : this.fallbackApiUrl;
            const fbRes = await fetch(fallbackUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Magnus-OS2-Providence-FX/1.0'
                },
                signal
            });

            if (!fbRes.ok) {
                throw new Error(`HTTP ${fbRes.status} al consultar fallback BCRD API (${target})`);
            }

            const fbJson = await fbRes.json();
            const buyVal = fbJson?.compra ?? fbJson?.buy ?? fbJson?.data?.compra;
            const sellVal = fbJson?.venta ?? fbJson?.sell ?? fbJson?.data?.venta;
            const dateVal = fbJson?.fecha ?? fbJson?.date ?? fbJson?.data?.fecha;

            if (!buyVal && !sellVal) {
                throw new Error(`Respuesta de fallback BCRD no contiene valores válidos para ${target}`);
            }

            const normalized = normalizeRateObservation({
                provider: this.id,
                rawInstitution: 'Banco Central de la República Dominicana',
                buy: buyVal,
                sell: sellVal,
                baseCurrency: target,
                quoteCurrency: 'DOP',
                observedAt: new Date(),
                providerUpdatedAt: dateVal ? new Date(dateVal) : null,
                rateType: RATE_TYPES.OFFICIAL_REFERENCE,
                metadata: {
                    source: `bcrd_intermediary_spot_${target.toLowerCase()}`
                }
            });

            return normalized ? [normalized] : [];
        });
    }
}
