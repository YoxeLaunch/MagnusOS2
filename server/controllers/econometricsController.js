/**
 * econometricsController.js — REST endpoints for econometric analysis in MagnusOS2.
 * 
 * Endpoints:
 *   GET  /api/econometrics/dashboard       — Summary (MPC + forecast + anomaly count)
 *   GET  /api/econometrics/forecast         — 30-day liquidity forecast with CI bands
 *   GET  /api/econometrics/anomalies        — List detected anomalies
 *   POST /api/econometrics/anomalies/:id/justify — Justify (dismiss) an anomaly
 *   POST /api/econometrics/detect-anomalies — Run anomaly detection scan
 */

import { DailyTransaction, FinancialAnomaly, Account } from '../models/index.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import {
    calculateMPC,
    forecastLiquidity,
    detectAnomalies,
    aggregateMonthly,
    aggregateDailyFlows,
    aggregateExpensesByCategory
} from '../services/econometricsService.js';
import { minorUnitsToSafeNumber } from '../models/account.js';

const sumAccountBalancesForAnalytics = accounts => {
    const totalMinor = accounts.reduce((sum, account) => sum + BigInt(String(account.currentBalanceMinor ?? 0)), 0n);
    return minorUnitsToSafeNumber(totalMinor, 'Econometrics account balance');
};

// ========================================
// GET /api/econometrics/dashboard
// Returns MPC, forecast summary, and pending anomaly count.
// ========================================
export const getDashboard = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.query.userId);

        // Fetch all daily transactions for this user
        const transactions = await DailyTransaction.findAll({
            where: { userId: effectiveUserId },
            order: [['date', 'ASC']],
            raw: true
        });

        // 1. Calculate MPC
        const monthlyData = aggregateMonthly(transactions);
        const mpc = calculateMPC(monthlyData);

        // 2. Forecast summary
        const dailyFlows = aggregateDailyFlows(transactions);
        // Get current balance from accounts (sum of all active accounts)
        let currentBalance = 0;
        try {
            const accounts = await Account.findAll({
                where: { userId: effectiveUserId, isArchived: false },
                attributes: ['currentBalanceMinor'],
                raw: true
            });
            currentBalance = sumAccountBalancesForAnalytics(accounts);
        } catch (err) {
            console.warn('[Econometrics] Account fetch fallback:', err.message);
        }

        const forecastResult = forecastLiquidity(dailyFlows, currentBalance);

        // 3. Pending anomaly count
        const pendingAnomalies = await FinancialAnomaly.count({
            where: { userId: effectiveUserId, status: 'pending' }
        });

        res.json({
            mpc: {
                beta: mpc.beta,
                mps: mpc.mps,
                rSquared: mpc.rSquared,
                interpretation: mpc.interpretation,
                dataPoints: mpc.dataPoints
            },
            forecast: forecastResult.summary,
            anomalies: {
                pending: pendingAnomalies
            }
        });
    } catch (error) {
        console.error('[Econometrics] Dashboard error:', error.message);
        res.status(500).json({ error: 'Error al generar dashboard econométrico.' });
    }
};

// ========================================
// GET /api/econometrics/forecast
// Returns 30-day forward liquidity projection with confidence bands.
// ========================================
export const getForecast = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.query.userId);

        const transactions = await DailyTransaction.findAll({
            where: { userId: effectiveUserId },
            order: [['date', 'ASC']],
            raw: true
        });

        const dailyFlows = aggregateDailyFlows(transactions);

        let currentBalance = 0;
        try {
            const accounts = await Account.findAll({
                where: { userId: effectiveUserId, isArchived: false },
                attributes: ['currentBalanceMinor'],
                raw: true
            });
            currentBalance = sumAccountBalancesForAnalytics(accounts);
        } catch (err) {
            console.warn('[Econometrics] Account fetch fallback:', err.message);
        }

        const result = forecastLiquidity(dailyFlows, currentBalance);

        res.json(result);
    } catch (error) {
        console.error('[Econometrics] Forecast error:', error.message);
        res.status(500).json({ error: 'Error al generar pronóstico de liquidez.' });
    }
};

// ========================================
// GET /api/econometrics/anomalies
// List detected anomalies for the user.
// ========================================
export const getAnomalies = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.query.userId);
        const { status } = req.query;

        const where = { userId: effectiveUserId };
        if (status) where.status = status;

        const anomalies = await FinancialAnomaly.findAll({
            where,
            order: [['date', 'DESC'], ['z_score', 'DESC']],
            limit: 50
        });

        res.json({ anomalies });
    } catch (error) {
        console.error('[Econometrics] Anomalies error:', error.message);
        res.status(500).json({ error: 'Error al listar anomalías.' });
    }
};

// ========================================
// POST /api/econometrics/anomalies/:id/justify
// Allows the user to explain/dismiss an anomaly.
// ========================================
export const justifyAnomaly = async (req, res) => {
    try {
        const { id } = req.params;
        const { justification } = req.body;
        const effectiveUserId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        if (!justification || typeof justification !== 'string' || justification.trim().length === 0) {
            return res.status(400).json({ error: 'Se requiere una justificación válida.' });
        }

        const sanitizedJustification = justification.trim().substring(0, 500);

        const where = { id };
        if (!isAdmin) where.userId = effectiveUserId;

        const anomaly = await FinancialAnomaly.findOne({ where });
        if (!anomaly) {
            return res.status(404).json({ error: 'Anomalía no encontrada.' });
        }

        await anomaly.update({
            status: 'justified',
            justification: sanitizedJustification
        });

        res.json({ ok: true, anomaly });
    } catch (error) {
        console.error('[Econometrics] Justify error:', error.message);
        res.status(500).json({ error: 'Error al justificar anomalía.' });
    }
};

// ========================================
// POST /api/econometrics/detect-anomalies
// Runs anomaly detection scan and persists results.
// ========================================
export const runDetection = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.body.userId);

        // Fetch expense transactions
        const transactions = await DailyTransaction.findAll({
            where: { userId: effectiveUserId },
            order: [['date', 'ASC']],
            raw: true
        });

        const expenseData = aggregateExpensesByCategory(transactions);
        const { anomalies, categorySummaries } = detectAnomalies(expenseData);

        // Persist new anomalies (avoid duplicates for same user+date+category)
        let saved = 0;
        for (const anomaly of anomalies) {
            const existing = await FinancialAnomaly.findOne({
                where: {
                    userId: effectiveUserId,
                    date: anomaly.date,
                    category: anomaly.category
                }
            });

            if (!existing) {
                await FinancialAnomaly.create({
                    userId: effectiveUserId,
                    date: anomaly.date,
                    category: anomaly.category,
                    amountActual: anomaly.amountActual,
                    amountExpected: anomaly.amountExpected,
                    residual: anomaly.residual,
                    zScore: anomaly.zScore,
                    description: anomaly.description,
                    status: 'pending'
                });
                saved++;
            }
        }

        console.log(`[Econometrics] Detection complete for ${effectiveUserId}: ${anomalies.length} found, ${saved} new saved.`);

        res.json({
            detected: anomalies.length,
            saved,
            anomalies,
            categorySummaries
        });
    } catch (error) {
        console.error('[Econometrics] Detection error:', error.message);
        res.status(500).json({ error: 'Error al ejecutar detección de anomalías.' });
    }
};
