import { MonthlySnapshot } from '../models/monthlySnapshot.js';
import { Op } from 'sequelize';

/**
 * snapshotService.js — CRUD abstraction for monthly_snapshots table.
 * Part of Magnus AI Chat v2.0 — Token Optimization Architecture.
 */

/**
 * Retrieves the snapshot for a given period.
 * @param {string} period — e.g. '2026-03-01' or '2026-03' (will be normalized)
 * @returns {MonthlySnapshot|null}
 */
export const getSnapshot = async (period) => {
    try {
        // Normalize period to YYYY-MM-01
        const normalizedPeriod = normalizePeriod(period);
        const snapshot = await MonthlySnapshot.findOne({
            where: { period: normalizedPeriod }
        });
        return snapshot;
    } catch (err) {
        console.error('[SnapshotService] Error getting snapshot:', err.message);
        return null;
    }
};

/**
 * Saves (upsert) a monthly snapshot.
 * @param {string} period — e.g. '2026-03'
 * @param {object} computedMetrics — { totalIncome, totalExpenses, balance, savingsRate, topCategories }
 * @param {object} geminiResponse — { narrative, alerts, recommendations, tokensUsed }
 */
export const saveSnapshot = async (period, computedMetrics, geminiResponse) => {
    try {
        const normalizedPeriod = normalizePeriod(period);
        const [snapshot, created] = await MonthlySnapshot.upsert({
            period: normalizedPeriod,
            computed_metrics: computedMetrics,
            gemini_narrative: geminiResponse.narrative,
            gemini_alerts: geminiResponse.alerts || [],
            gemini_recommendations: geminiResponse.recommendations || [],
            tokens_used: geminiResponse.tokensUsed || 0,
            created_at: new Date()
        }, { returning: true });
        
        console.log(`[SnapshotService] Snapshot ${created ? 'created' : 'updated'} for period: ${normalizedPeriod}`);
        return snapshot;
    } catch (err) {
        console.error('[SnapshotService] Error saving snapshot:', err.message);
        throw err;
    }
};

/**
 * Lists the last N monthly snapshots (newest first).
 * @param {number} limit — Default: 12 months
 * @returns {MonthlySnapshot[]}
 */
export const listSnapshots = async (limit = 12) => {
    try {
        return await MonthlySnapshot.findAll({
            order: [['period', 'DESC']],
            limit,
            attributes: ['id', 'period', 'tokens_used', 'created_at', 'computed_metrics']
        });
    } catch (err) {
        console.error('[SnapshotService] Error listing snapshots:', err.message);
        return [];
    }
};

/**
 * Returns true if the snapshot is older than 30 days (needs regeneration).
 * @param {MonthlySnapshot} snapshot
 * @returns {boolean}
 */
export const isStale = (snapshot) => {
    if (!snapshot || !snapshot.created_at) return true;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(snapshot.created_at) < thirtyDaysAgo;
};

/**
 * Gets the most recent snapshot available (for circuit breaker fallback).
 * @returns {MonthlySnapshot|null}
 */
export const getLatestSnapshot = async () => {
    try {
        return await MonthlySnapshot.findOne({
            order: [['period', 'DESC']]
        });
    } catch (err) {
        console.error('[SnapshotService] Error getting latest snapshot:', err.message);
        return null;
    }
};

// ---- Helper ----
const normalizePeriod = (period) => {
    if (!period) {
        // Default to current month
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
    // If already YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return period;
    // If YYYY-MM, append -01
    if (/^\d{4}-\d{2}$/.test(period)) return `${period}-01`;
    return period;
};
