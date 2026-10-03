/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // INFODOLAR PROVIDER
 * DOM Scraping of Dominican Commercial Banks using Cheerio
 * ============================================================================
 */

import { BaseFxProvider } from './baseProvider.js';
import { normalizeRateObservation, cleanString } from '../normalizer.js';
import { RATE_TYPES } from '../types.js';

export class InfoDolarProvider extends BaseFxProvider {
    constructor() {
        const isEnabled = process.env.INFODOLAR_ENABLED !== 'false';
        super({
            id: 'infodolar',
            name: 'InfoDolar RD (Agregador Bancario)',
            enabled: isEnabled
        });

        this.usdUrl = 'https://www.infodolar.com.do/';
        this.eurUrl = 'https://www.infodolar.com.do/precio-euro.aspx';
    }

    /**
     * Extrae las tasas de los bancos de la página HTML utilizando Cheerio (DOM Parser)
     * @param {string} targetCurrency - 'USD' o 'EUR'
     * @returns {Promise<Array>}
     */
    async getRates(targetCurrency = 'USD') {
        const target = (targetCurrency || 'USD').toUpperCase();
        const targetUrl = target === 'EUR' ? this.eurUrl : this.usdUrl;

        return this.executeWithProtection(async (signal) => {
            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'es-DO,es-ES;q=0.9,es;q=0.8,en;q=0.7'
                },
                signal
            });

            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status} de InfoDolar (${target})`);
            }

            const html = await response.text();
            if (!html || html.length < 500) {
                throw new Error(`Respuesta de InfoDolar (${target}) vacía o truncada`);
            }

            // Cargar Cheerio para parsing DOM estricto (no regex frágil)
            const cheerioModule = await import('cheerio');
            const cheerio = cheerioModule.default || cheerioModule;
            const $ = cheerio.load(html);

            const normalizedObservations = [];
            const anomalousInstitutions = [];

            // Iterar filas de tablas de cotizaciones y destacadas
            $('table.cotizaciones tr, table.destacadas tr').each((index, rowEl) => {
                const row = $(rowEl);

                // Extraer el nombre de la institución (span .nombre o título del enlace/logo)
                let rawInstitution = row.find('.nombre').text().trim();
                if (!rawInstitution) {
                    rawInstitution = row.find('a[title]').attr('title') || row.find('img[alt]').attr('alt') || '';
                }

                if (!rawInstitution || cleanString(rawInstitution) === '') {
                    return; // Fila sin entidad identificable (header, anuncio, etc.)
                }

                // Omitir fila de promedio si no representa un banco individual (lo calcularemos nosotros)
                if (cleanString(rawInstitution).includes('promedio infodolar')) {
                    return;
                }

                // Extraer celdas con data-order que contienen el valor numérico
                const cells = row.find('td[data-order]');
                if (cells.length < 2) {
                    return;
                }

                const rawBuy = $(cells[0]).attr('data-order') || $(cells[0]).text();
                const rawSell = $(cells[1]).attr('data-order') || $(cells[1]).text();

                const normalized = normalizeRateObservation({
                    provider: this.id,
                    rawInstitution,
                    buy: rawBuy,
                    sell: rawSell,
                    baseCurrency: target,
                    quoteCurrency: 'DOP',
                    observedAt: new Date(),
                    rateType: RATE_TYPES.RETAIL_BANK,
                    metadata: {
                        source: `infodolar_dom_${target.toLowerCase()}`
                    }
                });

                if (normalized && normalized.buy && normalized.sell) {
                    // Verificación de anomalía: sell >= buy en condiciones normales de mercado
                    if (normalized.sell < normalized.buy) {
                        anomalousInstitutions.push({
                            institution: normalized.institutionName,
                            buy: normalized.buy,
                            sell: normalized.sell
                        });
                        console.warn(`[FX][INFODOLAR][${target}] Anomalía de spread invertido detectada: ${normalized.institutionName} (Compra: ${normalized.buy}, Venta: ${normalized.sell})`);
                    }

                    normalizedObservations.push(normalized);
                }
            });

            // Si tras parsear la tabla no obtuvimos al menos 3 bancos reconocidos, el DOM cambió
            if (normalizedObservations.length < 3) {
                throw new Error(`DOM de InfoDolar (${target}) no produjo datos válidos mínimos (solo ${normalizedObservations.length} entidades extraídas)`);
            }

            return normalizedObservations;
        });
    }
}
