/**
 * ============================================================================
 * MACRO RD // BCRD OFFICIAL DATA PROVIDER & PARSER
 * Ingestión estructurada y validada desde el portal oficial del BCRD
 * ============================================================================
 */

import * as cheerio from 'cheerio';

const BCRD_HOMEPAGE_URL = 'https://www.bancentral.gov.do/';
const ALLOWED_HOSTS = ['www.bancentral.gov.do', 'bancentral.gov.do', 'cdn.bancentral.gov.do'];

export class BcrdMacroProvider {
    constructor() {
        this.id = 'bcrd';
        this.name = 'Banco Central de la República Dominicana (Oficial)';
        this.baseUrl = BCRD_HOMEPAGE_URL;
        this.timeoutMs = parseInt(process.env.MACRO_TIMEOUT_MS || '9000', 10);
    }

    /**
     * Valida que una URL pertenezca al dominio institucional del BCRD (SSRF Protection)
     */
    #validateUrl(urlStr) {
        try {
            const parsed = new URL(urlStr);
            if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
                throw new Error(`Host no autorizado para ingesta BCRD: ${parsed.hostname}`);
            }
            return true;
        } catch (err) {
            throw new Error(`URL BCRD inválida: ${err.message}`);
        }
    }

    /**
     * Limpia y parsea un string numérico con posibles comas, signos de porcentaje o dólares
     * ej: "5.13%" -> 5.13, "$15,235.2" -> 15235.2
     */
    #parseNumber(raw) {
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
        if (!raw || typeof raw !== 'string') return null;
        const cleaned = raw.replace(/[^\d.-]/g, '');
        const val = parseFloat(cleaned);
        return Number.isFinite(val) ? val : null;
    }

    /**
     * Ingesta y normaliza los indicadores oficiales prioritarios de la portada del BCRD
     * @returns {Promise<{ observations: Array<Object>, rawTablesCount: number, latencyMs: number }>}
     */
    async fetchMacroIndicators() {
        this.#validateUrl(this.baseUrl);
        const startTime = Date.now();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(this.baseUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Magnus-OS2-MacroRD/1.0 (Financial Research System; +https://magnus.local)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'es-DO,es;q=0.9,en;q=0.8'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} al consultar BCRD (${this.baseUrl})`);
            }

            const html = await response.text();
            const latencyMs = Date.now() - startTime;
            const $ = cheerio.load(html);

            const observations = [];
            const tables = $('table');

            // Recorremos las tablas para extraer los bloques semánticos
            tables.each((_, el) => {
                const text = $(el).text().replace(/\s+/g, ' ').trim();

                // 1. INFLACIÓN (IPC)
                if (text.includes('Inflación (variación %)') || (text.includes('Inflación') && text.includes('Interanual') && !text.includes('subyacente'))) {
                    const periodMatch = text.match(/([A-Za-z]+ \d{4})/i);
                    const period = periodMatch ? periodMatch[1] : 'Último dato';

                    const yoyMatch = text.match(/Interanual\s*([\d.]+)%/i);
                    const mMatch = text.match(/Mensual\s*([\d.]+)%/i);
                    const accMatch = text.match(/Acumulada\s*([\d.]+)%/i);

                    if (yoyMatch) {
                        const yoy = this.#parseNumber(yoyMatch[1]);
                        if (yoy !== null && yoy >= -5 && yoy <= 50) {
                            observations.push({
                                indicatorId: 'INFLATION_YOY',
                                indicatorName: 'Inflación Interanual',
                                category: 'PRICES',
                                frequency: 'MONTHLY',
                                value: yoy,
                                unit: '%',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'line',
                                metadata: { accumulated: accMatch ? this.#parseNumber(accMatch[1]) : null }
                            });
                        }
                    }

                    if (mMatch) {
                        const mVal = this.#parseNumber(mMatch[1]);
                        if (mVal !== null && mVal >= -10 && mVal <= 20) {
                            observations.push({
                                indicatorId: 'INFLATION_MONTHLY',
                                indicatorName: 'Inflación Mensual',
                                category: 'PRICES',
                                frequency: 'MONTHLY',
                                value: mVal,
                                unit: '%',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'line'
                            });
                        }
                    }
                }

                // 2. INFLACIÓN SUBYACENTE
                if (text.includes('Inflación subyacente')) {
                    const periodMatch = text.match(/(?:Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s*\d{4}/i);
                    const period = periodMatch ? periodMatch[0].trim() : 'Último dato';
                    const yoyMatch = text.match(/Interanual\s*([\d.]+)%/i);
                    const mMatch = text.match(/Mensual\s*([\d.]+)%/i);

                    if (yoyMatch) {
                        const yoy = this.#parseNumber(yoyMatch[1]);
                        if (yoy !== null && yoy >= -5 && yoy <= 50) {
                            observations.push({
                                indicatorId: 'INFLATION_CORE',
                                indicatorName: 'Inflación Subyacente',
                                category: 'PRICES',
                                frequency: 'MONTHLY',
                                value: yoy,
                                unit: '%',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'line',
                                metadata: { monthly: mMatch ? this.#parseNumber(mMatch[1]) : null }
                            });
                        }
                    }
                }

                // 3. TASA DE POLÍTICA MONETARIA (TPM)
                if (text.includes('Tasa de política monetaria') || text.includes('política monetaria')) {
                    const periodMatch = text.match(/([A-Za-z]+ \d{4})/i);
                    const period = periodMatch ? periodMatch[1] : 'Última decisión';
                    const rateMatch = text.match(/([\d.]+)\s*%/i);

                    if (rateMatch) {
                        const tpm = this.#parseNumber(rateMatch[1]);
                        if (tpm !== null && tpm >= 0 && tpm <= 30) {
                            observations.push({
                                indicatorId: 'TPM',
                                indicatorName: 'Tasa de Política Monetaria (TPM)',
                                category: 'MONETARY_POLICY',
                                frequency: 'EVENT_DRIVEN',
                                value: tpm,
                                unit: '%',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'step'
                            });
                        }
                    }
                }

                // 4. TASAS DE INTERÉS BANCARIAS (INTERBANCARIA, ACTIVA, PASIVA)
                if (text.includes('Tasas de interés') && (text.includes('Activa') || text.includes('Pasiva'))) {
                    const periodMatch = text.match(/([A-Za-z]+ \d{4})/i);
                    const period = periodMatch ? periodMatch[1] : 'Último dato';

                    const interMatch = text.match(/Interbancaria\s*([\d.]+)%/i);
                    const activeMatch = text.match(/Activa[^\d]+([\d.]+)%/i);
                    const passiveMatch = text.match(/Pasiva[^\d]+([\d.]+)%/i);

                    if (interMatch) {
                        const interVal = this.#parseNumber(interMatch[1]);
                        if (interVal !== null) {
                            observations.push({
                                indicatorId: 'RATE_INTERBANK',
                                indicatorName: 'Tasa Interbancaria',
                                category: 'BANKING',
                                frequency: 'MONTHLY',
                                value: interVal,
                                unit: '%',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'line'
                            });
                        }
                    }

                    if (activeMatch) {
                        const activeVal = this.#parseNumber(activeMatch[1]);
                        if (activeVal !== null && activeVal >= 0 && activeVal <= 50) {
                            observations.push({
                                indicatorId: 'RATE_ACTIVE',
                                indicatorName: 'Tasa Activa Promedio (Banca Múltiple)',
                                category: 'BANKING',
                                frequency: 'MONTHLY',
                                value: activeVal,
                                unit: '%',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'line'
                            });
                        }
                    }

                    if (passiveMatch) {
                        const passiveVal = this.#parseNumber(passiveMatch[1]);
                        if (passiveVal !== null && passiveVal >= 0 && passiveVal <= 50) {
                            observations.push({
                                indicatorId: 'RATE_PASSIVE',
                                indicatorName: 'Tasa Pasiva Promedio (Banca Múltiple)',
                                category: 'BANKING',
                                frequency: 'MONTHLY',
                                value: passiveVal,
                                unit: '%',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'line'
                            });
                        }
                    }
                }

                // 5. IMAE (ACTIVIDAD ECONÓMICA REAL)
                if (text.includes('IMAE original') || text.includes('IMAE')) {
                    const periodMatch = text.match(/([A-Za-z]+ \d{4})/i);
                    const period = periodMatch ? periodMatch[1] : 'Último dato';
                    const yoyMatch = text.match(/(?:Agosto \d{4}|[A-Za-z]+ \d{4})\s*([\d.]+)%/i) || text.match(/([\d.]+)%/i);
                    const accMatch = text.match(/Ene-[A-Za-z]+\s*\d{4}\s*([\d.]+)%/i);

                    if (yoyMatch) {
                        const imaeVal = this.#parseNumber(yoyMatch[1]);
                        if (imaeVal !== null && imaeVal >= -30 && imaeVal <= 30) {
                            observations.push({
                                indicatorId: 'IMAE_YOY',
                                indicatorName: 'IMAE (Actividad Económica Interanual)',
                                category: 'ACTIVITY',
                                frequency: 'MONTHLY',
                                value: imaeVal,
                                unit: '%',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'line',
                                metadata: { accumulated: accMatch ? this.#parseNumber(accMatch[1]) : null }
                            });
                        }
                    }
                }

                // 6. PRÉSTAMOS PRIVADOS (CRÉDITO AL SECTOR PRIVADO)
                if (text.includes('Préstamos privados') || text.includes('Crédito al sector privado')) {
                    const periodMatch = text.match(/([A-Za-z]+ \d{4})/i);
                    const period = periodMatch ? periodMatch[1] : 'Último dato';
                    const totalMatch = text.match(/Total\s*([\d.]+)%/i) || text.match(/([\d.]+)%/i);
                    const natMatch = text.match(/Mon\.\s*nacional\s*([\d.]+)%/i);

                    if (totalMatch) {
                        const creditVal = this.#parseNumber(totalMatch[1]);
                        if (creditVal !== null && creditVal >= -20 && creditVal <= 50) {
                            observations.push({
                                indicatorId: 'PRIVATE_CREDIT_YOY',
                                indicatorName: 'Crédito al Sector Privado (Interanual)',
                                category: 'CREDIT',
                                frequency: 'MONTHLY',
                                value: creditVal,
                                unit: '%',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'line',
                                metadata: { nationalCurrency: natMatch ? this.#parseNumber(natMatch[1]) : null }
                            });
                        }
                    }
                }

                // 7. RESERVAS INTERNACIONALES
                if (text.includes('Reservas internacionales')) {
                    const periodMatch = text.match(/([A-Za-z]+ \d{4})/i);
                    const period = periodMatch ? periodMatch[1] : 'Último dato';
                    const netMatch = text.match(/Netas\s*\$?([\d,.]+)/i);
                    const grossMatch = text.match(/Brutas\s*\$?([\d,.]+)/i);

                    if (netMatch) {
                        const netVal = this.#parseNumber(netMatch[1]);
                        if (netVal !== null && netVal > 1000 && netVal < 50000) {
                            observations.push({
                                indicatorId: 'RESERVES_NET',
                                indicatorName: 'Reservas Internacionales Netas',
                                category: 'EXTERNAL',
                                frequency: 'MONTHLY',
                                value: netVal,
                                unit: 'US$ MM',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'line',
                                metadata: { gross: grossMatch ? this.#parseNumber(grossMatch[1]) : null }
                            });
                        }
                    }
                }

                // 8. TIPO DE CAMBIO SPOT OFICIAL BCRD
                if (text.includes('Tipo de cambio') && (text.includes('Compra') || text.includes('Venta'))) {
                    const periodMatch = text.match(/(\d+\s*de\s*[A-Za-z]+\s*\d{4})/i);
                    const period = periodMatch ? periodMatch[1] : 'Spot BCRD';
                    const buyMatch = text.match(/Compra\s*([\d.]+)/i);
                    const sellMatch = text.match(/Venta\s*([\d.]+)/i);

                    if (buyMatch && sellMatch) {
                        const buyVal = this.#parseNumber(buyMatch[1]);
                        const sellVal = this.#parseNumber(sellMatch[1]);
                        if (buyVal !== null && sellVal !== null && buyVal > 30 && sellVal < 100) {
                            const midVal = Math.round(((buyVal + sellVal) / 2) * 10000) / 10000;
                            observations.push({
                                indicatorId: 'USD_DOP_BCRD',
                                indicatorName: 'USD / DOP (Referencia Oficial BCRD)',
                                category: 'FX',
                                frequency: 'DAILY',
                                value: midVal,
                                unit: 'RD$',
                                referencePeriod: period,
                                source: 'BCRD',
                                sourceUrl: this.baseUrl,
                                preferredChartType: 'line',
                                metadata: { buy: buyVal, sell: sellVal, spread: Math.round((sellVal - buyVal) * 10000) / 10000 }
                            });
                        }
                    }
                }
            });

            // Si por alguna razón de estructura falló la extracción de los indicadores críticos, lanzamos error
            if (observations.length === 0) {
                throw new Error('No se detectaron tablas de indicadores macroeconómicos válidas en la respuesta del BCRD');
            }

            return {
                observations,
                rawTablesCount: tables.length,
                latencyMs
            };
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
}
