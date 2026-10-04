import { MonthlySnapshot } from '../models/monthlySnapshot.js';
import { Op } from 'sequelize';

/**
 * snapshotService.js — CRUD abstraction for monthly_snapshots table.
 * Part of Magnus AI Chat v2.0 — Token Optimization Architecture.
 */

/**
 * Retrieves the snapshot for a given user and period.
 * @param {string} userId — User ID
 * @param {string} period — e.g. '2026-03-01' or '2026-03' (will be normalized)
 * @returns {MonthlySnapshot|null}
 */
export const getSnapshot = async (userId, period) => {
    try {
        // If only 1 arg passed for backwards compat
        const targetUserId = period ? userId : 'soberano';
        const targetPeriod = period || userId;
        const normalizedPeriod = normalizePeriod(targetPeriod);

        const snapshot = await MonthlySnapshot.findOne({
            where: {
                userId: targetUserId,
                period: normalizedPeriod
            }
        });
        return snapshot;
    } catch (err) {
        console.error('[SnapshotService] Error getting snapshot:', err.message);
        return null;
    }
};

/**
 * Saves (upsert) a monthly snapshot for a user.
 * @param {string} userId — User ID
 * @param {string} period — e.g. '2026-03'
 * @param {object} computedMetrics — { totalIncome, totalExpenses, balance, savingsRate, topCategories }
 * @param {object} geminiResponse — { narrative, alerts, recommendations, tokensUsed }
 */
export const saveSnapshot = async (userId, period, computedMetrics, geminiResponse) => {
    try {
        const targetUserId = geminiResponse ? userId : 'soberano';
        const targetPeriod = geminiResponse ? period : arguments[0];
        const targetMetrics = geminiResponse ? computedMetrics : arguments[1];
        const targetGemini = geminiResponse ? geminiResponse : arguments[2];

        const normalizedPeriod = normalizePeriod(targetPeriod);
        
        // Include AI-generated distribution in the stored metrics
        const finalMetrics = {
            ...targetMetrics,
            distribution: targetGemini.distribution || []
        };

        const [snapshot, created] = await MonthlySnapshot.upsert({
            userId: targetUserId,
            period: normalizedPeriod,
            computed_metrics: finalMetrics,
            gemini_narrative: targetGemini.narrative,
            gemini_alerts: targetGemini.alerts || [],
            gemini_recommendations: targetGemini.recommendations || [],
            tokens_used: targetGemini.tokensUsed || 0,
            created_at: new Date()
        }, { returning: true });
        
        console.log(`[SnapshotService] Snapshot ${created ? 'created' : 'updated'} for user ${targetUserId}, period: ${normalizedPeriod}`);
        return snapshot;
    } catch (err) {
        console.error('[SnapshotService] Error saving snapshot:', err.message);
        throw err;
    }
};

/**
 * Lists the last N monthly snapshots for a user (newest first).
 * @param {string} userId — User ID
 * @param {number} limit — Default: 12 months
 * @returns {MonthlySnapshot[]}
 */
export const listSnapshots = async (userId = 'soberano', limit = 12) => {
    try {
        return await MonthlySnapshot.findAll({
            where: { userId },
            order: [['period', 'DESC']],
            limit,
            attributes: ['id', 'userId', 'period', 'tokens_used', 'created_at', 'computed_metrics']
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
 * Gets the most recent snapshot available for a user (for circuit breaker fallback).
 * @param {string} userId — User ID
 * @returns {MonthlySnapshot|null}
 */
export const getLatestSnapshot = async (userId = 'soberano') => {
    try {
        return await MonthlySnapshot.findOne({
            where: { userId },
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
