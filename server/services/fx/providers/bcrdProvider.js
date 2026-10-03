/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // BCRD OFFICIAL REFERENCE PROVIDER
 * Fetches the official spot exchange rate of the Central Bank of Dominican Republic
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

        // Endpoint de referencia oficial comunitaria (BCRD)
        this.apiUrl = 'https://api.dominicanaapi.com/v1/bcrd/tasa-cambio';
    }

    /**
     * Consulta la tasa oficial spot del BCRD
     * @returns {Promise<Array>}
     */
    async getRates() {
        return this.executeWithProtection(async (signal) => {
            const response = await fetch(this.apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Magnus-OS2-Providence-FX/1.0'
                },
                signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} al consultar BCRD API`);
            }

            const json = await response.json();
            
            // El schema suele devolver { compra: xx.xx, venta: xx.xx, fecha: "..." }
            const buyVal = json?.compra ?? json?.buy ?? json?.data?.compra;
            const sellVal = json?.venta ?? json?.sell ?? json?.data?.venta;
            const dateVal = json?.fecha ?? json?.date ?? json?.data?.fecha;

            if (!buyVal && !sellVal) {
                throw new Error('Respuesta de BCRD no contiene valores válidos de compra o venta');
            }

            const normalized = normalizeRateObservation({
                provider: this.id,
                rawInstitution: 'Banco Central de la República Dominicana',
                buy: buyVal,
                sell: sellVal,
                observedAt: new Date(),
                providerUpdatedAt: dateVal ? new Date(dateVal) : null,
                rateType: RATE_TYPES.OFFICIAL_REFERENCE,
                metadata: {
                    source: 'bcrd_official_spot'
                }
            });

            return normalized ? [normalized] : [];
        });
    }
}
