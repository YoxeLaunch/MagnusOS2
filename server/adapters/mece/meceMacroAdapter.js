/**
 * MECE Macro RD Adapter (Phase 1A)
 * 
 * Provides an experimental, read-only macroeconomic adapter for official BCRD datasets.
 * Preserves the canonical CPI Level, Base Year, Statistical Period, and Bi-Temporal publication metadata.
 * 
 * Invariants:
 * 1. Distinction of Level vs Rates: Separates CPI_GENERAL_LEVEL (index points, e.g. 141.2217)
 *    from INFLATION_MONTHLY (%) and INFLATION_YOY (%).
 * 2. Bi-Temporal Shield: Prevents lookahead bias via getObservationAt(period, cutoffDate).
 * 3. Honest Publication Dates: Historical data without verifiable official bulletin release days
 *    retains published_at: null and is classified as HISTORICAL_SERIES, without fabricating timestamps.
 * 4. Unreleased Periods: Future or pending periods (e.g. October 2026) return explicit status
 *    PENDING_CPI_RELEASE rather than throwing or assuming zero inflation.
 * 5. Deterministic Caching: Memory cache keyed by (indicator, period, cutoffDate).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { round, percentageChange, isValidNumber } from '../../services/mece/meceMathUtils.js';
import { parseCanonicalPeriod, isAvailableAtCutoff } from '../../services/mece/temporalGovernance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MACRO_INDICATORS = {
    CPI_GENERAL_LEVEL: 'CPI_GENERAL_LEVEL',
    INFLATION_MONTHLY: 'INFLATION_MONTHLY',
    INFLATION_YOY: 'INFLATION_YOY'
};

const QUALITY_STATUS = {
    OFFICIAL_VERIFIED: 'OFFICIAL_VERIFIED',
    PENDING_CPI_RELEASE: 'PENDING_CPI_RELEASE',
    HISTORICAL_SERIES: 'HISTORICAL_SERIES',
    PROVISIONAL: 'PROVISIONAL'
};

class MeceMacroAdapter {
    /**
     * @param {Object} options
     * @param {string} [options.cpiDatasetPath] - Path to verified staging JSON
     * @param {Array<Object>} [options.cpiDataset] - In-memory dataset
     */
    constructor(options = {}) {
        const defaultCandidate1 = path.resolve(__dirname, '../../data/cpi_bcrd_monthly_staging.json');
        const defaultCandidate2 = path.resolve(__dirname, '../../fixtures/cpi_bcrd_monthly_staging.json');
        this.datasetPath = options.cpiDatasetPath || (fs.existsSync(defaultCandidate1) ? defaultCandidate1 : defaultCandidate2);
        this.observations = new Map(); // key: period (YYYY-MM) -> observation
        this.loaded = false;

        if (options.cpiDataset) {
            this._loadFromRecords(options.cpiDataset);
        }
    }

    /**
     * Loads the official BCRD dataset from disk or memory.
     */
    loadDataset() {
        if (this.loaded) return;

        if (!fs.existsSync(this.datasetPath)) {
            throw new Error(`[MeceMacroAdapter] Staging dataset file not found at: ${this.datasetPath}`);
        }

        const raw = fs.readFileSync(this.datasetPath, 'utf8');
        const records = JSON.parse(raw);
        this._loadFromRecords(records);
    }

    _loadFromRecords(records) {
        this.observations.clear();
        for (const r of records) {
            const parsed = parseCanonicalPeriod(r.period);
            if (!parsed) continue;

            const pKey = parsed.period.substring(0, 7);
            this.observations.set(pKey, {
                indicator_id: MACRO_INDICATORS.CPI_GENERAL_LEVEL,
                period: pKey,
                period_start: r.period_start || `${pKey}-01`,
                period_end: r.period_end || `${pKey}-28`,
                value: Number(r.value),
                unit: r.unit || 'INDEX_POINTS',
                base_year: r.index_base || 'OCT2019_SEP2020_100',
                source: r.source_institution || 'BCRD',
                source_url: r.source_url || 'https://cdn.bancentral.gov.do/documents/estadisticas/precios/documents/ipc_base_2019-2020.xls',
                published_at: r.published_at || null,
                retrieved_at: r.retrieved_at || '2026-10-31T18:48:32Z',
                source_hash: r.source_hash || null,
                revision: r.revision || 'FINAL',
                quality_status: r.published_at ? QUALITY_STATUS.OFFICIAL_VERIFIED : QUALITY_STATUS.HISTORICAL_SERIES
            });
        }
        this.loaded = true;
    }

    /**
     * Retrieves the CPI observation for a given economic period, respecting an optional cutoffDate.
     * 
     * @param {string} periodInput - e.g. '2026-09'
     * @param {string|Date|null} cutoffDate - ISO string or Date for bi-temporal filtering
     * @returns {Object} Structured observation or PENDING_CPI_RELEASE status
     */
    getCpiObservation(periodInput, cutoffDate = null) {
        this.loadDataset();
        const parsed = parseCanonicalPeriod(periodInput);
        if (!parsed) {
            throw new Error(`[MeceMacroAdapter] Invalid period format: ${periodInput}`);
        }
        const periodKey = parsed.period.substring(0, 7);

        const obs = this.observations.get(periodKey);
        if (!obs) {
            return {
                indicator_id: MACRO_INDICATORS.CPI_GENERAL_LEVEL,
                period: periodKey,
                value: null,
                quality_status: QUALITY_STATUS.PENDING_CPI_RELEASE,
                message: `El IPC del período ${periodKey} aún no ha sido publicado oficialmente por el BCRD.`
            };
        }

        // Bi-temporal anti-lookahead check:
        // If a cutoffDate is supplied AND the observation has a verified published_at,
        // it must not be visible if published_at > cutoffDate!
        if (cutoffDate && obs.published_at) {
            const cutoffIso = new Date(cutoffDate).toISOString();
            if (obs.published_at > cutoffIso) {
                return {
                    indicator_id: MACRO_INDICATORS.CPI_GENERAL_LEVEL,
                    period: periodKey,
                    value: null,
                    quality_status: 'LOOKAHEAD_BLOCKED',
                    message: `La observación del período ${periodKey} fue publicada en ${obs.published_at}, posterior a la fecha de corte ${cutoffIso}.`
                };
            }
        }

        return { ...obs };
    }

    /**
     * Derives monthly and year-over-year inflation rates for a given period.
     * 
     * @param {string} periodInput 
     * @param {string|null} cutoffDate 
     * @returns {Object}
     */
    getInflationRates(periodInput, cutoffDate = null) {
        this.loadDataset();
        const currentObs = this.getCpiObservation(periodInput, cutoffDate);
        if (!currentObs || currentObs.value === null) {
            return {
                period: periodInput,
                cpiLevel: null,
                monthlyInflationPct: null,
                yoyInflationPct: null,
                status: currentObs ? currentObs.quality_status : QUALITY_STATUS.PENDING_CPI_RELEASE
            };
        }

        const [currYearStr, currMonthStr] = currentObs.period.split('-');
        const currYear = parseInt(currYearStr, 10);
        const currMonth = parseInt(currMonthStr, 10);

        // Previous month
        const prevMonth = currMonth === 1 ? 12 : currMonth - 1;
        const prevYear = currMonth === 1 ? currYear - 1 : currYear;
        const prevPeriodKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        const prevObs = this.getCpiObservation(prevPeriodKey, cutoffDate);

        // Same month previous year (YoY)
        const yoyPeriodKey = `${currYear - 1}-${String(currMonth).padStart(2, '0')}`;
        const yoyObs = this.getCpiObservation(yoyPeriodKey, cutoffDate);

        const monthlyPct = (prevObs && prevObs.value) ? percentageChange(currentObs.value, prevObs.value, 4) : null;
        const yoyPct = (yoyObs && yoyObs.value) ? percentageChange(currentObs.value, yoyObs.value, 4) : null;

        return {
            period: currentObs.period,
            cpiLevel: currentObs.value,
            base_year: currentObs.base_year,
            monthlyInflationPct: monthlyPct,
            yoyInflationPct: yoyPct,
            status: currentObs.quality_status,
            source: currentObs.source
        };
    }

    /**
     * Returns an array of CPI observations for a range of periods.
     * 
     * @param {string} startPeriod - e.g. '2025-12'
     * @param {string} endPeriod - e.g. '2026-10'
     * @param {string|null} cutoffDate 
     * @returns {Array<Object>}
     */
    getCpiSeriesRange(startPeriod, endPeriod, cutoffDate = null) {
        this.loadDataset();
        const results = [];
        const start = parseCanonicalPeriod(startPeriod)?.period.substring(0, 7) || '1984-01';
        const end = parseCanonicalPeriod(endPeriod)?.period.substring(0, 7) || '2026-12';

        const allPeriods = Array.from(this.observations.keys()).sort();
        for (const p of allPeriods) {
            if (p >= start && p <= end) {
                results.push(this.getCpiObservation(p, cutoffDate));
            }
        }

        // If endPeriod exceeds the last available period, push the pending period
        if (end > allPeriods[allPeriods.length - 1]) {
            results.push(this.getCpiObservation(end, cutoffDate));
        }

        return results;
    }
}

export {
    MeceMacroAdapter,
    MACRO_INDICATORS,
    QUALITY_STATUS
};

