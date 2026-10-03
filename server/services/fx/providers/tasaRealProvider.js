/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // TASAREAL PROVIDER
 * Official REST API Integration with TasaReal (Commercial Bank Aggregator)
 * ============================================================================
 */

import { BaseFxProvider } from './baseProvider.js';
import { normalizeRateObservation } from '../normalizer.js';
import { RATE_TYPES } from '../types.js';

export class TasaRealProvider extends BaseFxProvider {
    constructor() {
        const isEnabled = process.env.TASAREAL_ENABLED !== 'false';
        super({
            id: 'tasareal',
            name: 'TasaReal API',
            enabled: isEnabled
        });

        this.apiUrl = 'https://tasareal.com/api/v1/rates';
    }

    /**
     * Retorna la API Key leyendo estrictamente del entorno sin exponerla en memoria global
     */
    #getApiKey() {
        return process.env.TASAREAL_API_KEY ? process.env.TASAREAL_API_KEY.trim() : null;
    }

    /**
     * Consulta las tasas de cambio de TasaReal
     * @returns {Promise<Array>} Lista de observaciones normalizadas
     */
    async getRates() {
        const apiKey = this.#getApiKey();

        if (!apiKey) {
            console.log('[FX][TASAREAL] Saltando consulta: TASAREAL_API_KEY no configurada en variables de entorno.');
            return {
                success: false,
                skipped: true,
                error: 'TASAREAL_API_KEY no configurada',
                data: []
            };
        }

        return this.executeWithProtection(async (signal) => {
            const response = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'X-API-Key': apiKey,
                    'Accept': 'application/json',
                    'User-Agent': 'Magnus-OS2-Providence-FX/1.0'
                },
                signal
            });

            if (!response.ok) {
                // Registro seguro: status HTTP sin exponer la API key
                throw new Error(`HTTP Error ${response.status} de TasaReal`);
            }

            const json = await response.json();
            
            // Validar schema devuelto por la API (puede venir como { data: [...] } o array directo)
            const rawList = Array.isArray(json) 
                ? json 
                : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.rates) ? json.rates : null));

            if (!rawList) {
                throw new Error('Respuesta de TasaReal no contiene un array de cotizaciones válido');
            }

            const normalizedObservations = [];

            for (const item of rawList) {
                if (!item || typeof item !== 'object') continue;

                // Filtrar exclusivamente cotizaciones en USD
                const currency = (item.currency || item.moneda || item.base || 'USD').toUpperCase();
                if (currency !== 'USD') continue;

                // Mapear nombres flexibles de la entidad
                const institutionName = item.institution_name || item.institution || item.bank || item.name || item.entidad;
                if (!institutionName) continue;

                // Extraer compra y venta
                const buyVal = item.buy ?? item.compra ?? item.rate_buy;
                const sellVal = item.sell ?? item.venta ?? item.rate_sell;
                const updatedAt = item.updated_at || item.date || item.fecha || item.last_updated;

                const isOfficial = item.institution_type === 'official' || String(institutionName).toLowerCase().includes('banco central');

                const normalized = normalizeRateObservation({
                    provider: this.id,
                    rawInstitution: String(institutionName),
                    buy: buyVal,
                    sell: sellVal,
                    observedAt: new Date(),
                    providerUpdatedAt: updatedAt ? new Date(updatedAt) : null,
                    rateType: isOfficial ? RATE_TYPES.OFFICIAL_REFERENCE : RATE_TYPES.RETAIL_BANK,
                    metadata: {
                        source: 'tasareal_api',
                        verification: item.verification || null
                    }
                });

                if (normalized && (normalized.buy || normalized.sell)) {
                    normalizedObservations.push(normalized);
                }
            }

            if (normalizedObservations.length === 0) {
                throw new Error('TasaReal respondió pero no se extrajeron cotizaciones válidas');
            }

            return normalizedObservations;
        });
    }
}
