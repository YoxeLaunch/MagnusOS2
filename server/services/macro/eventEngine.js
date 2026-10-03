/**
 * ============================================================================
 * MAGNUS EVENT ENGINE // MACRO & FX EVENT DETECTOR
 * Detección inteligente de publicaciones, cambios relevantes y anomalías
 * Deduplicación por clave de idempotencia & generación de notificaciones
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MagnusEvent, MagnusNotification } from '../../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../../config/macro-events.json');

export class MagnusEventEngine {
    constructor() {
        this.config = this.#loadConfig();
        this.io = null; // Socket.io instance
    }

    setSocket(ioInstance) {
        this.io = ioInstance;
    }

    #loadConfig() {
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (err) {
            console.warn('[EVENT_ENGINE] Error leyendo config/macro-events.json, usando defaults:', err.message);
        }

        return {
            thresholds: {
                TPM: { watchDelta: 0.25, importantDelta: 0.50, unit: 'pp' },
                INFLATION_YOY: { watchDelta: 0.20, importantDelta: 0.50, unit: 'pp' },
                RATE_ACTIVE: { watchDelta: 0.50, importantDelta: 1.00, unit: 'pp' },
                RATE_PASSIVE: { watchDelta: 0.40, importantDelta: 0.80, unit: 'pp' },
                IMAE_YOY: { watchDelta: 1.0, importantDelta: 2.0, unit: 'pp' },
                RESERVES_NET: { watchDelta: 500.0, importantDelta: 1000.0, unit: 'US$ MM' },
                USD_DOP_BCRD: { watchPercent: 0.50, importantPercent: 1.00, unit: '%' }
            },
            settings: {
                notifyInfo: false,
                notifyWatch: true,
                notifyImportant: true,
                notifyCritical: true
            }
        };
    }

    /**
     * Evalúa una observación recién ingresada contra su estado anterior
     * @param {Object} current - Observación entrante
     * @param {Object|null} previous - Última observación previa registrada en DB
     * @returns {Promise<Object|null>} Evento generado o null
     */
    async evaluateObservation(current, previous = null) {
        if (!current || !current.indicatorId) return null;

        const { indicatorId, referencePeriod, value, unit, indicatorName } = current;
        const conf = this.config.thresholds[indicatorId] || {};

        let eventType = null;
        let severity = 'INFO';
        let delta = null;
        let title = '';
        let message = '';

        // Caso A: Primera vez que se ingesta el indicador
        if (!previous) {
            eventType = 'NEW_PUBLICATION';
            severity = 'INFO';
            title = `${indicatorName || indicatorId}: Publicación Inicial`;
            message = `Se registró ${indicatorName || indicatorId} en ${value} ${unit || ''} para el periodo ${referencePeriod || 'reciente'}.`;
        } 
        // Caso B: Nuevo periodo de referencia publicado (ej: de Julio a Agosto)
        else if (previous.referencePeriod !== referencePeriod) {
            delta = Math.round((value - previous.value) * 10000) / 10000;
            const deltaAbs = Math.abs(delta);
            const deltaPct = previous.value !== 0 ? Math.abs((delta / previous.value) * 100) : 0;

            eventType = 'NEW_PUBLICATION';
            severity = 'INFO';

            // Evaluar si además el cambio sobrepasa umbrales configurados
            if (conf.importantDelta && deltaAbs >= conf.importantDelta) {
                severity = 'IMPORTANT';
                eventType = 'RELEVANT_CHANGE';
            } else if (conf.importantPercent && deltaPct >= conf.importantPercent) {
                severity = 'IMPORTANT';
                eventType = 'RELEVANT_CHANGE';
            } else if (conf.watchDelta && deltaAbs >= conf.watchDelta) {
                severity = 'WATCH';
                eventType = 'VALUE_CHANGE';
            } else if (conf.watchPercent && deltaPct >= conf.watchPercent) {
                severity = 'WATCH';
                eventType = 'VALUE_CHANGE';
            }

            const sign = delta > 0 ? '+' : '';
            title = `${indicatorName || indicatorId}: ${referencePeriod}`;
            message = `El BCRD publicó ${indicatorName || indicatorId} en ${value} ${unit} (${sign}${delta} ${conf.unit || unit} frente al periodo anterior).`;
        }
        // Caso C: Mismo periodo pero el valor cambió (Revisión Estadística oficial)
        else if (previous.value !== value) {
            delta = Math.round((value - previous.value) * 10000) / 10000;
            eventType = 'REVISION';
            severity = Math.abs(delta) >= (conf.watchDelta || 0.5) ? 'WATCH' : 'INFO';
            const sign = delta > 0 ? '+' : '';
            title = `${indicatorName || indicatorId}: Revisión ${referencePeriod}`;
            message = `El BCRD actualizó el dato de ${referencePeriod} de ${previous.value} a ${value} ${unit} (${sign}${delta} ${conf.unit || unit}).`;
        }
        // Caso D: Mismo periodo y mismo valor -> Idéntico, no emitir evento
        else {
            return null;
        }

        // Construir clave de idempotencia estricta para evitar cualquier duplicación
        const idempotencyKey = `${current.domain || 'MACRO_RD'}:${indicatorId}:${referencePeriod || 'none'}:${value}:${eventType}`;

        try {
            // Verificar si ya existe este evento específico en la base de datos
            const existing = await MagnusEvent.findOne({ where: { idempotencyKey } });
            if (existing) {
                return null; // Ya procesado previamente
            }

            const eventRecord = await MagnusEvent.create({
                eventType,
                domain: current.domain || 'MACRO_RD',
                indicatorId,
                title,
                message,
                severity,
                referencePeriod,
                valueBefore: previous ? previous.value : null,
                valueAfter: value,
                delta,
                unit,
                idempotencyKey,
                metadata: {
                    source: current.source || 'BCRD',
                    sourceUrl: current.sourceUrl,
                    generatedAt: new Date().toISOString()
                }
            });

            // Crear notificación persistente para los usuarios
            const notification = await MagnusNotification.create({
                eventId: eventRecord.id,
                userId: null, // Broadcast a toda la plataforma
                title,
                message,
                severity,
                isRead: false,
                linkUrl: '/finanza/mercado',
                metadata: {
                    indicatorId,
                    eventType,
                    referencePeriod,
                    value,
                    delta,
                    unit
                }
            });

            // Emitir por Socket.io en tiempo real si está conectado (sin bloquear)
            if (this.io) {
                try {
                    this.io.emit('macro:event', {
                        event: eventRecord,
                        notification
                    });
                } catch (socketErr) {
                    console.warn('[EVENT_ENGINE] Error al emitir por socket:', socketErr.message);
                }
            }

            console.log(`[EVENT_ENGINE][${severity}] ${title} | ${message}`);
            return { event: eventRecord, notification };
        } catch (dbErr) {
            // Si hubo colisión de clave única por concurrencia, lo ignoramos limpiamente
            if (dbErr.name === 'SequelizeUniqueConstraintError') {
                return null;
            }
            console.error('[EVENT_ENGINE] Error persistiendo evento:', dbErr.message);
            return null;
        }
    }
}

export const eventEngine = new MagnusEventEngine();
