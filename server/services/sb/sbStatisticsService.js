/**
 * ============================================================================
 * SUPERINTENDENCIA DE BANCOS (SB) // INGESTION & STATISTICS SERVICE
 * Data extraction, normalization, resilient UPSERT, dual-key failover and KPI prep.
 * ============================================================================
 */

import { sequelize, SbBankingMetric, SbSyncRun } from '../../models/index.js';
import { Op } from 'sequelize';
import { assessSbVolumeAnomalies, getSbOperationalStatus } from './sbMetrics.js';

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const DEFAULT_BASE_URL = 'https://apis.sb.gob.do/estadisticas/v2';
const DEFAULT_PAGE_SIZE = 1500;
const REQUEST_TIMEOUT_MS = 25000;
const MAX_RETRIES = 2;

// Supported Entity Types in SB API v2
export const SB_ENTITY_TYPES = [
    { code: 'BM', name: 'Bancos Múltiples', priority: 1 },
    { code: 'AAyP', name: 'Asociaciones de Ahorros y Préstamos', priority: 2 },
    { code: 'BAyC', name: 'Bancos de Ahorro y Crédito', priority: 3 }
];

export class SbStatisticsService {
    constructor() {
        this.baseUrl = process.env.SB_API_BASE_URL || DEFAULT_BASE_URL;
        this.primaryKey = process.env.SB_SUBSCRIPTION_KEY || '';
        this.secondaryKey = process.env.SB_SECONDARY_KEY || '';
        this.enabled = process.env.SB_ENABLED !== 'false';
        this.activeKeyType = 'PRIMARY'; // 'PRIMARY' | 'SECONDARY'
        this.memoryCache = new Map();
        this.cacheTtlMs = 4 * 60 * 60 * 1000; // 4 horas para datos mensuales
    }

    /**
     * Retorna la clave activa actual sin exponerla
     */
    #getActiveKey() {
        if (this.activeKeyType === 'PRIMARY' && this.primaryKey) {
            return { key: this.primaryKey, type: 'PRIMARY' };
        }
        if (this.secondaryKey) {
            return { key: this.secondaryKey, type: 'SECONDARY' };
        }
        return { key: this.primaryKey, type: 'PRIMARY' };
    }

    /**
     * Alterna la clave activa tras un fallo de autorización (401/403)
     */
    #switchKey(reason = '') {
        const prev = this.activeKeyType;
        if (prev === 'PRIMARY' && this.secondaryKey) {
            this.activeKeyType = 'SECONDARY';
            console.warn(`[SB_API] Failover automático: Conmutando a clave SECUNDARIA (${reason})`);
            return true;
        } else if (prev === 'SECONDARY' && this.primaryKey) {
            this.activeKeyType = 'PRIMARY';
            console.warn(`[SB_API] Failover automático: Conmutando a clave PRIMARIA (${reason})`);
            return true;
        }
        return false;
    }

    /**
     * Normaliza los códigos de divisa de texto largo a código ISO estándar
     */
    normalizeCurrency(divisaRaw = '') {
        const upper = (divisaRaw || '').toUpperCase();
        if (upper.includes('PESO') || upper === 'DOP') return 'DOP';
        if (upper.includes('DÓLAR') || upper.includes('DOLAR') || upper === 'USD') return 'USD';
        if (upper.includes('EURO') || upper === 'EUR') return 'EUR';
        return upper.slice(0, 5);
    }

    /**
     * Normaliza un registro individual de la API de la SB
     */
    normalizeSbRecord(raw, retrievedAt = new Date()) {
        const divisa = (raw.divisa || '').trim();
        const currencyIso = this.normalizeCurrency(divisa);
        const balance = parseFloat(raw.balance) || 0;
        const tasaPonderada = parseFloat(raw.tasaPromedioPonderado) || 0;
        let tasaPonderadaBalance = parseFloat(raw.tasaPromedioPonderadoPorBalance) || 0;

        // Si la API entrega 0 o null en tasaPromedioPonderadoPorBalance pero tasaPromedioPonderado > 0,
        // aseguramos que el producto balance * tasa esté presente para agregaciones matemáticas
        if (tasaPonderadaBalance === 0 && tasaPonderada > 0 && balance > 0) {
            tasaPonderadaBalance = (balance * tasaPonderada);
        }

        return {
            periodo: (raw.periodo || '').trim(),
            tipoEntidad: (raw.tipoEntidad || '').trim(),
            entidad: (raw.entidad || '').trim().toUpperCase(),
            region: raw.region ? raw.region.trim() : null,
            provincia: (raw.provincia || '').trim().toUpperCase(),
            codigoIso: raw.codIso ? raw.codIso.trim() : null,
            persona: (raw.persona || '').trim(),
            divisa: divisa,
            currencyIso: currencyIso,
            cantidadInstrumentos: parseInt(raw.cantidadInstrumento, 10) || 0,
            balance: balance,
            tasaPonderadaBalance: tasaPonderadaBalance,
            tasaPonderada: tasaPonderada,
            retrievedAt: retrievedAt
        };
    }

    /**
     * Realiza una llamada HTTP protegida con timeout, reintentos y rotación de claves
     */
    async #fetchWithProtection(url, options = {}, attempt = 0) {
        const { key, type } = this.#getActiveKey();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Ocp-Apim-Subscription-Key': key,
                    'Accept': 'application/json',
                    'User-Agent': BROWSER_USER_AGENT,
                    ...(options.headers || {})
                }
            });
            clearTimeout(timer);

            // Manejo de 401/403 (Autenticación / Clave inválida)
            if (response.status === 401 || response.status === 403) {
                const canSwitch = this.#switchKey(`HTTP ${response.status}`);
                if (canSwitch && attempt < MAX_RETRIES) {
                    console.warn(`[SB_API] Reintentando llamada con clave alterna (intento ${attempt + 1})...`);
                    return this.#fetchWithProtection(url, options, attempt + 1);
                }
                const errText = await response.text().catch(() => '');
                throw new Error(`[SB_API] Error de autenticación HTTP ${response.status}: ${errText.slice(0, 150)}`);
            }

            // Manejo de Rate Limiting (429) y errores transitorios de servidor (5xx)
            if (response.status === 429 || response.status >= 500) {
                if (attempt < MAX_RETRIES) {
                    const delayMs = (attempt + 1) * 3000;
                    console.warn(`[SB_API] HTTP ${response.status} detectado. Reintentando tras ${delayMs}ms (intento ${attempt + 1}/${MAX_RETRIES})...`);
                    await new Promise(r => setTimeout(r, delayMs));
                    return this.#fetchWithProtection(url, options, attempt + 1);
                }
                throw new Error(`[SB_API] Error servidor/cuota HTTP ${response.status} tras ${MAX_RETRIES} reintentos.`);
            }

            if (!response.ok) {
                const errBody = await response.text().catch(() => '');
                throw new Error(`[SB_API] Petición fallida [${response.status}]: ${errBody.slice(0, 200)}`);
            }

            // Extraer metadatos de paginación de la cabecera x-pagination
            const paginationHeader = response.headers.get('x-pagination');
            let pagination = null;
            if (paginationHeader) {
                try {
                    pagination = JSON.parse(paginationHeader);
                } catch (_) {}
            }

            const data = await response.json();
            return {
                data: Array.isArray(data) ? data : (data?.Data || []),
                pagination: pagination,
                activeKeyType: type
            };

        } catch (error) {
            clearTimeout(timer);
            if (error.name === 'AbortError') {
                if (attempt < MAX_RETRIES) {
                    console.warn(`[SB_API] Timeout (${REQUEST_TIMEOUT_MS}ms). Reintentando...`);
                    return this.#fetchWithProtection(url, options, attempt + 1);
                }
                throw new Error(`[SB_API] Timeout de conexión superado (${REQUEST_TIMEOUT_MS}ms).`);
            }
            throw error;
        }
    }

    /**
     * Consulta una página específica de captaciones por localidad
     */
    async fetchSbPage({ periodo, tipoEntidad = 'BM', entidad = null, page = 1, pageSize = DEFAULT_PAGE_SIZE }) {
        const params = new URLSearchParams({
            periodoInicial: periodo,
            periodoFinal: periodo,
            paginas: String(page),
            registros: String(pageSize)
        });

        if (entidad) {
            params.append('entidad', entidad);
        } else if (tipoEntidad) {
            params.append('tipoEntidad', tipoEntidad);
        }

        const url = `${this.baseUrl}/captaciones/localidad?${params.toString()}`;
        return this.#fetchWithProtection(url, { method: 'GET' });
    }

    /**
     * Obtiene todos los registros de un período y tipo de entidad recorriendo la paginación de forma segura
     */
    async fetchAllSbPages({ periodo, tipoEntidad = 'BM' }) {
        let currentPage = 1;
        let hasMore = true;
        const allRecords = [];
        let totalReported = null;

        while (hasMore) {
            const result = await this.fetchSbPage({
                periodo,
                tipoEntidad,
                page: currentPage,
                pageSize: DEFAULT_PAGE_SIZE
            });

            const records = result.data || [];
            allRecords.push(...records);

            if (result.pagination) {
                totalReported = result.pagination.TotalRecords;
                hasMore = result.pagination.HasNext === true && records.length > 0;
            } else {
                hasMore = records.length >= DEFAULT_PAGE_SIZE;
            }

            if (hasMore) {
                currentPage += 1;
                // Pequeña pausa de cortesía para no saturar el gateway de la SB
                await new Promise(r => setTimeout(r, 200));
            }
        }

        return {
            records: allRecords,
            totalRecords: allRecords.length,
            totalReported
        };
    }

    /**
     * Persiste los registros normalizados en PostgreSQL de forma idempotente con UPSERT
     */
    async persistSbRecords(records) {
        if (!records || records.length === 0) {
            return { received: 0, inserted: 0, updated: 0, unchanged: 0, failed: 0 };
        }

        let inserted = 0;
        let updated = 0;
        let unchanged = 0;
        let failed = 0;

        // Ejecutar en lotes de 100 registros para alta eficiencia y no saturar el pool de conexiones
        const BATCH_SIZE = 100;
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);

            // Construir consulta UPSERT parametrizada para el lote
            const values = [];
            const bindParams = [];
            let paramIdx = 1;

            for (const r of batch) {
                values.push(`(
                    $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
                    $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
                    $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, NOW(), NOW(), NOW()
                )`);
                bindParams.push(
                    r.periodo,
                    r.tipoEntidad,
                    r.entidad,
                    r.region,
                    r.provincia,
                    r.codigoIso,
                    r.persona,
                    r.divisa,
                    r.currencyIso,
                    r.cantidadInstrumentos,
                    r.balance,
                    r.tasaPonderadaBalance,
                    r.tasaPonderada
                );
            }

            const upsertQuery = `
                INSERT INTO public.sb_banking_metrics (
                    periodo, tipo_entidad, entidad, region, provincia,
                    codigo_iso, persona, divisa, currency_iso, cantidad_instrumentos,
                    balance, tasa_ponderada_balance, tasa_ponderada, retrieved_at, created_at, updated_at
                )
                VALUES ${values.join(', ')}
                ON CONFLICT (periodo, entidad, tipo_entidad, provincia, persona, divisa)
                DO UPDATE SET
                    cantidad_instrumentos = EXCLUDED.cantidad_instrumentos,
                    balance = EXCLUDED.balance,
                    tasa_ponderada_balance = EXCLUDED.tasa_ponderada_balance,
                    tasa_ponderada = EXCLUDED.tasa_ponderada,
                    region = COALESCE(EXCLUDED.region, sb_banking_metrics.region),
                    codigo_iso = COALESCE(EXCLUDED.codigo_iso, sb_banking_metrics.codigo_iso),
                    currency_iso = EXCLUDED.currency_iso,
                    retrieved_at = NOW(),
                    updated_at = NOW()
                WHERE
                    sb_banking_metrics.balance IS DISTINCT FROM EXCLUDED.balance OR
                    sb_banking_metrics.tasa_ponderada IS DISTINCT FROM EXCLUDED.tasa_ponderada OR
                    sb_banking_metrics.tasa_ponderada_balance IS DISTINCT FROM EXCLUDED.tasa_ponderada_balance OR
                    sb_banking_metrics.cantidad_instrumentos IS DISTINCT FROM EXCLUDED.cantidad_instrumentos
                RETURNING (xmax = 0) AS is_insert;
            `;

            try {
                const [results] = await sequelize.query(upsertQuery, { bind: bindParams });
                const touchedCount = results.length;
                const batchInserts = results.filter(r => r.is_insert).length;
                const batchUpdates = touchedCount - batchInserts;
                const batchUnchanged = batch.length - touchedCount;

                inserted += batchInserts;
                updated += batchUpdates;
                unchanged += batchUnchanged;
            } catch (err) {
                console.error('[SB_SERVICE] Error persistiendo lote en BD:', err.message);
                failed += batch.length;
            }
        }

        return {
            received: records.length,
            inserted,
            updated,
            unchanged,
            failed
        };
    }

    /**
     * Sincroniza un período completo (YYYY-MM) para todas las entidades bancarias
     */
    async syncSbMonth(periodo, options = {}) {
        const startTime = Date.now();
        console.log(`[SB_SERVICE] Iniciando sincronización de período: ${periodo}...`);

        let totalReceived = 0;
        let totalInserted = 0;
        let totalUpdated = 0;
        let totalUnchanged = 0;
        let totalFailed = 0;
        const entitySummaries = [];

        for (const type of SB_ENTITY_TYPES) {
            try {
                console.log(`[SB_SERVICE] Extrayendo ${type.name} (${type.code}) para ${periodo}...`);
                const { records } = await this.fetchAllSbPages({ periodo, tipoEntidad: type.code });

                if (records.length === 0) {
                    console.log(`[SB_SERVICE] Sin registros para ${type.code} en ${periodo}.`);
                    continue;
                }

                // Normalización
                const normalized = records.map(r => this.normalizeSbRecord(r));

                // Persistencia UPSERT
                const stats = await this.persistSbRecords(normalized);

                totalReceived += stats.received;
                totalInserted += stats.inserted;
                totalUpdated += stats.updated;
                totalUnchanged += stats.unchanged;
                totalFailed += stats.failed;

                entitySummaries.push({
                    type: type.code,
                    count: records.length,
                    inserted: stats.inserted,
                    updated: stats.updated
                });

            } catch (err) {
                console.error(`[SB_SERVICE] Error procesando ${type.code} en ${periodo}:`, err.message);
                totalFailed += 1;
            }
        }

        const durationMs = Date.now() - startTime;
        const status = totalReceived === 0 ? 'EMPTY' : (totalFailed > 0 ? 'PARTIAL' : 'SUCCESS');

        const anomalyWarnings = await this.#getAnomalyWarnings(periodo);
        for (const warning of anomalyWarnings) {
            console.warn(`[SB_DATA_QUALITY] ${warning.code}`, warning);
        }

        // Registrar en tabla sb_sync_runs
        await SbSyncRun.create({
            periodo,
            entityType: 'ALL',
            status,
            recordsReceived: totalReceived,
            recordsInserted: totalInserted,
            recordsUpdated: totalUpdated,
            recordsUnchanged: totalUnchanged,
            durationMs,
            activeKeyUsed: this.activeKeyType,
            errorMessage: totalFailed > 0 ? `${totalFailed} fallos durante la sincronización` : null,
            metadata: {
                entities: entitySummaries,
                anomalyWarnings,
                manualAudit: options.audit || null,
                completedAt: new Date().toISOString()
            }
        });

        // Invalidar caché tras sincronización exitosa
        this.memoryCache.clear();

        console.log(`[SB_SERVICE] Período ${periodo} completado (${durationMs}ms): Recibidos=${totalReceived}, Insertados=${totalInserted}, Actualizados=${totalUpdated}, Sin cambios=${totalUnchanged}`);

        return {
            periodo,
            status,
            totalReceived,
            totalInserted,
            totalUpdated,
            totalUnchanged,
            totalFailed,
            durationMs,
            activeKey: this.activeKeyType,
            anomalyWarnings
        };
    }

    async #getAnomalyWarnings(periodo) {
        const [rows] = await sequelize.query(`
            WITH current_period AS (
                SELECT COUNT(*)::int AS record_count, COUNT(DISTINCT entidad)::int AS entity_count
                FROM public.sb_banking_metrics WHERE periodo = $1
            ), previous_period_key AS (
                SELECT DISTINCT periodo FROM public.sb_banking_metrics
                WHERE periodo < $1 ORDER BY periodo DESC LIMIT 1
            ), previous_period AS (
                SELECT COUNT(*)::int AS record_count, COUNT(DISTINCT entidad)::int AS entity_count
                FROM public.sb_banking_metrics WHERE periodo = (SELECT periodo FROM previous_period_key)
            )
            SELECT c.record_count AS current_record_count, c.entity_count AS current_entity_count,
                   p.record_count AS previous_record_count, p.entity_count AS previous_entity_count
            FROM current_period c CROSS JOIN previous_period p;
        `, { bind: [periodo] });
        const row = rows[0];
        if (!row || row.previous_record_count === null) return [];
        return assessSbVolumeAnomalies({
            current: { recordCount: row.current_record_count, entityCount: row.current_entity_count },
            previous: { recordCount: row.previous_record_count, entityCount: row.previous_entity_count }
        });
    }

    /**
     * Sincroniza un rango controlado de períodos (ej: '2025-01' a '2026-08')
     */
    async syncHistoricalRange(startPeriod, endPeriod, { onProgress = null } = {}) {
        const periods = [];
        const [startYear, startMonth] = startPeriod.split('-').map(Number);
        const [endYear, endMonth] = endPeriod.split('-').map(Number);

        let curYear = startYear;
        let curMonth = startMonth;

        while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
            const p = `${curYear}-${String(curMonth).padStart(2, '0')}`;
            periods.push(p);
            curMonth += 1;
            if (curMonth > 12) {
                curMonth = 1;
                curYear += 1;
            }
        }

        console.log(`[SB_SERVICE] Sincronización histórica planificada: ${periods.length} períodos (${startPeriod} -> ${endPeriod})`);
        const results = [];

        for (let idx = 0; idx < periods.length; idx++) {
            const p = periods[idx];
            console.log(`[SB_SERVICE] Progreso histórico [${idx + 1}/${periods.length}]: Sincronizando ${p}...`);

            try {
                const res = await this.syncSbMonth(p);
                results.push(res);
                if (onProgress) {
                    onProgress({ current: idx + 1, total: periods.length, period: p, status: res.status });
                }
            } catch (err) {
                console.error(`[SB_SERVICE] Error en período histórico ${p}:`, err.message);
                results.push({ periodo: p, status: 'FAILED', error: err.message });
            }

            // Respetar límite de tasa entre meses (500ms)
            await new Promise(r => setTimeout(r, 500));
        }

        return {
            totalPeriods: periods.length,
            results
        };
    }

    /**
     * Verifica cuál es el último período disponible en la SB y en BD y sincroniza si hay pendientes
     */
    async syncLatestSbPeriod(options = {}) {
        const operationalStatus = getSbOperationalStatus({
            enabled: this.enabled,
            hasPrimaryKey: Boolean(this.primaryKey),
            hasSecondaryKey: Boolean(this.secondaryKey)
        });
        if (operationalStatus === 'MISCONFIGURED') {
            console.error('[SB_CONFIG_MISSING] SB_ENABLED=true but no SB API key is configured.');
            return {
                action: 'MISCONFIGURED',
                operationalStatus,
                message: 'SB_CONFIG_MISSING: no primary or secondary SB API key is configured.'
            };
        }
        // 1. Obtener último período en BD
        const lastDbRecord = await SbBankingMetric.findOne({
            order: [['periodo', 'DESC']]
        });
        const lastDbPeriod = lastDbRecord ? lastDbRecord.periodo : null;

        // 2. Determinar el mes actual y meses recientes posibles
        const now = new Date();
        const candidatePeriods = [];
        for (let i = 0; i <= 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            candidatePeriods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        // Buscar el último período publicado por la SB
        let latestPublished = null;
        for (const candidate of candidatePeriods) {
            try {
                const result = await this.fetchSbPage({ periodo: candidate, tipoEntidad: 'BM', page: 1, pageSize: 2 });
                if (result.data && result.data.length > 0) {
                    latestPublished = candidate;
                    break;
                }
            } catch (_) {}
        }

        if (!latestPublished) {
            return {
                action: 'NO_OP',
                message: 'No se detectaron períodos publicados recientes en la API de la SB.',
                lastDbPeriod
            };
        }

        if (lastDbPeriod && lastDbPeriod >= latestPublished) {
            return {
                action: 'UP_TO_DATE',
                message: `La base de datos ya está al día con el último período oficial publicado (${latestPublished}).`,
                lastDbPeriod,
                latestPublished
            };
        }

        console.log(`[SB_SERVICE] Nuevo período detectado en la SB: ${latestPublished} (Último en BD: ${lastDbPeriod || 'ninguno'}). Sincronizando...`);
        const syncResult = await this.syncSbMonth(latestPublished, options);

        return {
            action: 'SYNCED',
            message: `Sincronizado exitosamente nuevo período ${latestPublished}.`,
            lastDbPeriod,
            latestPublished,
            syncResult
        };
    }

    /**
     * Retorna el estado global de la sincronización de la SB
     */
    async getSbSyncStatus() {
        const totalRecords = await SbBankingMetric.count();
        const [periodRange] = await sequelize.query(`
            SELECT MIN(periodo) as min_periodo, MAX(periodo) as max_periodo,
                   COUNT(DISTINCT entidad) as total_entidades,
                   COUNT(DISTINCT divisa) as total_divisas
            FROM public.sb_banking_metrics;
        `);

        const lastRuns = await SbSyncRun.findAll({
            order: [['executed_at', 'DESC']],
            limit: 5
        });

        const hasPrimaryKey = Boolean(this.primaryKey);
        const hasSecondaryKey = Boolean(this.secondaryKey);
        return {
            enabled: this.enabled,
            operationalStatus: getSbOperationalStatus({ enabled: this.enabled, hasPrimaryKey, hasSecondaryKey }),
            totalRecords,
            minPeriodo: periodRange[0]?.min_periodo || null,
            maxPeriodo: periodRange[0]?.max_periodo || null,
            totalEntidades: parseInt(periodRange[0]?.total_entidades || '0', 10),
            totalDivisas: parseInt(periodRange[0]?.total_divisas || '0', 10),
            activeKey: this.activeKeyType,
            hasPrimaryKey,
            hasSecondaryKey,
            recentRuns: lastRuns
        };
    }
}

export const sbStatisticsService = new SbStatisticsService();
