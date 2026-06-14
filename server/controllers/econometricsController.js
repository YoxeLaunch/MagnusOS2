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
import {
    calculateMPC,
    forecastLiquidity,
    detectAnomalies,
    aggregateMonthly,
    aggregateDailyFlows,
    aggregateExpensesByCategory
} from '../services/econometricsService.js';
import { Op } from 'sequelize';

// ========================================
// GET /api/econometrics/dashboard
// Returns MPC, forecast summary, and pending anomaly count.
// ========================================
export const getDashboard = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Fetch all daily transactions for this user
        const transactions = await DailyTransaction.findAll({
            where: { userId },
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
                where: { userId, status: 'active' },
                attributes: ['currentBalanceMinor'],
                raw: true
            });
            // fromMinorUnits equivalent: divide by 100
            currentBalance = accounts.reduce((sum, a) => sum + (a.currentBalanceMinor || 0) / 100, 0);
        } catch {
            // Accounts table may not exist for all users; use 0 as fallback
        }

        const forecastResult = forecastLiquidity(dailyFlows, currentBalance);

        // 3. Pending anomaly count
        const pendingAnomalies = await FinancialAnomaly.count({
            where: { userId, status: 'pending' }
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
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const transactions = await DailyTransaction.findAll({
            where: { userId },
            order: [['date', 'ASC']],
            raw: true
        });

        const dailyFlows = aggregateDailyFlows(transactions);

        let currentBalance = 0;
        try {
            const accounts = await Account.findAll({
                where: { userId, status: 'active' },
                attributes: ['currentBalanceMinor'],
                raw: true
            });
            currentBalance = accounts.reduce((sum, a) => sum + (a.currentBalanceMinor || 0) / 100, 0);
        } catch {
            // Fallback
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
        const { userId, status } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const where = { userId };
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

        if (!justification || typeof justification !== 'string' || justification.trim().length === 0) {
            return res.status(400).json({ error: 'Se requiere una justificación válida.' });
        }

        // Limit justification length to prevent abuse
        const sanitizedJustification = justification.trim().substring(0, 500);

        const anomaly = await FinancialAnomaly.findByPk(id);
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
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Fetch expense transactions
        const transactions = await DailyTransaction.findAll({
            where: { userId },
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
                    userId,
                    date: anomaly.date,
                    category: anomaly.category
                }
            });

            if (!existing) {
                await FinancialAnomaly.create({
                    userId,
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

        console.log(`[Econometrics] Detection complete for ${userId}: ${anomalies.length} found, ${saved} new saved.`);

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
