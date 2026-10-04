/**
 * monthlyAnalysisJob.js — Monthly Analysis Engine
 * Part of Magnus AI Chat v2.0
 * 
 * Runs at 3:00 AM on day 1 of each month via node-cron.
 * Can be triggered manually:
 *   node server/jobs/monthlyAnalysisJob.js --force --period=2026-02
 *
 * Flow:
 *  1. Query all transactions for target month from PostgreSQL
 *  2. Compute aggregated metrics in Node.js (no Gemini yet)
 *  3. Call Gemini ONCE with compressed summary
 *  4. Parse and validate response
 *  5. Save to monthly_snapshots table
 */
import 'dotenv/config';
import cron from 'node-cron';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { User } from '../models/index.js';
import { initDb } from '../models/index.js';
import { LedgerAnalyticsService } from '../services/ledgerAnalyticsService.js';
import { saveSnapshot, getSnapshot, isStale } from '../services/snapshotService.js';
import { Op } from 'sequelize';
import { minorToDecimalString, toMinorUnitsBigInt } from '../models/account.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// ========================================
// Manual Run Flag Handler
// ========================================
const args = process.argv.slice(2);
const isForced = args.includes('--force');
const periodArg = args.find(a => a.startsWith('--period='))?.split('=')[1];
const userArg = args.find(a => a.startsWith('--user='))?.split('=')[1];

// ========================================
// Utility: Get date range for a period (YYYY-MM)
// ========================================
const getPeriodRange = (period) => {
    if (!period) {
        // Default: last month
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = lastMonth.getFullYear();
        const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
        return getPeriodRange(`${year}-${month}`);
    }

    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month

    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        periodKey: `${year}-${String(month).padStart(2, '0')}-01`
    };
};

// ========================================
// Utility: Compute metrics from transactions
// ========================================
const computeMetrics = (transactions) => {
    let totalIncomeMinor = 0n;
    let totalExpensesMinor = 0n;
    const categoryMap = {};

    for (const tx of transactions) {
        const amountMinor = tx.amountMinor == null
            ? toMinorUnitsBigInt(tx.amount ?? 0)
            : BigInt(String(tx.amountMinor));
        const desc = tx.description || 'Sin categoría';

        const absoluteMinor = amountMinor < 0n ? -amountMinor : amountMinor;
        const isIncome = tx.type === 'income' || tx.type === 'ingreso';
        if (isIncome) {
            totalIncomeMinor += absoluteMinor;
        } else {
            totalExpensesMinor += absoluteMinor;
            const cat = desc.split(' ')[0] || 'Otros'; // Simple categorization
            categoryMap[cat] = (categoryMap[cat] || 0n) + absoluteMinor;
        }
    }

    const balanceMinor = totalIncomeMinor - totalExpensesMinor;
    const savingsRateTenths = totalIncomeMinor > 0n ? balanceMinor * 1000n / totalIncomeMinor : 0n;
    if (savingsRateTenths < BigInt(Number.MIN_SAFE_INTEGER) || savingsRateTenths > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new RangeError('Monthly savings rate exceeds JavaScript safe integer range');
    }
    const savingsRate = Number(savingsRateTenths) / 10;

    // Top 5 categories by expense
    const topCategories = Object.entries(categoryMap)
        .sort(([, a], [, b]) => (a === b ? 0 : a > b ? -1 : 1))
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount: minorToDecimalString(amount) }));

    return {
        totalIncome: minorToDecimalString(totalIncomeMinor),
        totalExpenses: minorToDecimalString(totalExpensesMinor),
        balance: minorToDecimalString(balanceMinor),
        savingsRate,
        topCategories,
        txCount: transactions.length
    };
};

// ========================================
// Core: Run monthly analysis for a single user
// ========================================
const runAnalysisForUser = async (userId, period) => {
    const { startDate, endDate, periodKey } = getPeriodRange(period);
    console.log(`[Job] ▶ Starting monthly analysis for user '${userId}', period: ${periodKey} (${startDate} → ${endDate})`);

    // STEP 1: Check if snapshot already exists and is fresh
    if (!isForced) {
        const existing = await getSnapshot(userId, periodKey);
        if (existing && !isStale(existing)) {
            console.log(`[Job] ⏭ Snapshot already exists and is fresh for user '${userId}' at ${periodKey}. Skipping.`);
            return existing;
        }
    }

    // STEP 2: Query transactions for the period scoped to userId from the double-entry ledger
    let transactions = [];
    try {
        transactions = await LedgerAnalyticsService.getNormalizedTimeline({
            userId,
            startDate,
            endDate
        });
        console.log(`[Job] User '${userId}': fetched ${transactions.length} ledger transactions for period ${periodKey}.`);
    } catch (err) {
        console.error(`[Job] DB query error for user '${userId}':`, err.message);
        throw err;
    }

    if (transactions.length === 0) {
        console.log(`[Job] User '${userId}': no transactions found for ${periodKey}. Saving empty snapshot.`);
        return await saveSnapshot(userId, periodKey, { txCount: 0 }, {
            narrative: 'No se registraron transacciones en este período.',
            alerts: [],
            recommendations: [],
            tokensUsed: 0
        });
    }

    // STEP 3: Compute metrics in Node.js (no token cost)
    const metrics = computeMetrics(transactions);

    // STEP 4: Call Gemini ONCE with compressed summary
    let geminiResponse = {
        narrative: 'Análisis no disponible (Gemini no configurado).',
        alerts: [],
        recommendations: [],
        tokensUsed: 0
    };

    if (genAI) {
        const prompt = `Eres un analista financiero. Analiza este resumen mensual de MagnusOS para el usuario ${userId} y genera:

PERÍODO: ${periodKey}
MÉTRICAS:
- Ingresos totales: ${metrics.totalIncome}
- Gastos totales: ${metrics.totalExpenses}
- Balance neto: ${metrics.balance}
- Tasa de ahorro: ${metrics.savingsRate}%
- Transacciones: ${metrics.txCount}
- Top categorías de gasto: ${JSON.stringify(metrics.topCategories)}

Responde en formato JSON con exactamente esta estructura (sin markdown):
{
  "narrative": "Párrafo de 3-4 oraciones con diagnóstico del período en español",
  "alerts": ["Alerta crítica 1", "Alerta importante 2", "Observación 3"],
  "recommendations": ["Recomendación accionable 1", "Recomendación accionable 2"]
}`;

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 1024,
                    temperature: 0.1
                }
            });

            const responseText = result.response.text();
            const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;

            try {
                const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
                const parsed = JSON.parse(cleaned);
                geminiResponse = {
                    narrative: parsed.narrative || '',
                    alerts: parsed.alerts || [],
                    recommendations: parsed.recommendations || [],
                    tokensUsed
                };
            } catch (parseErr) {
                geminiResponse.narrative = responseText.substring(0, 1000);
                geminiResponse.tokensUsed = tokensUsed;
            }
        } catch (geminiErr) {
            console.error(`[Job] Gemini API error for user '${userId}':`, geminiErr.message);
            geminiResponse.narrative = `Error al generar análisis narrativo: ${geminiErr.message}`;
        }
    }

    // STEP 5: Save snapshot to PostgreSQL
    const savedSnapshot = await saveSnapshot(userId, periodKey, metrics, geminiResponse);
    console.log(`[Job] ✅ Snapshot saved for user '${userId}', period ${periodKey}`);
    return savedSnapshot;
};

// ========================================
// Run for all active users
// ========================================
const runAnalysisForAllUsers = async (period) => {
    try {
        const users = await User.findAll({ attributes: ['username'] });
        console.log(`[Job] Running monthly analysis for ${users.length} users...`);
        for (const u of users) {
            try {
                await runAnalysisForUser(u.username, period);
            } catch (userErr) {
                console.error(`[Job] Error analyzing user '${u.username}':`, userErr.message);
            }
        }
    } catch (err) {
        console.error('[Job] Failed to query users for monthly analysis:', err.message);
    }
};

// ========================================
// Manual trigger
// ========================================
if (isForced) {
    console.log(`[Job] 🔧 MANUAL TRIGGER — User: ${userArg || 'all'}, Period: ${periodArg || 'last month'}`);

    const bootstrap = async () => {
        try {
            await initDb();
            if (userArg) {
                await runAnalysisForUser(userArg, periodArg);
            } else {
                await runAnalysisForAllUsers(periodArg);
            }
            console.log('[Job] ✅ Manual run complete. Exiting.');
            process.exit(0);
        } catch (err) {
            console.error('[Job] ❌ Manual run failed:', err.message);
            process.exit(1);
        }
    };
    bootstrap();
} else {
    // ========================================
    // Cron Scheduler: Day 1 of each month at 3:00 AM
    // ========================================
    console.log('[Job] 🕐 Cron scheduler active — will run on the 1st of every month at 3:00 AM');

    cron.schedule('0 3 1 * *', async () => {
        console.log(`[Job] 🕐 Cron triggered at ${new Date().toISOString()}`);
        try {
            await runAnalysisForAllUsers(null); // null = last month
        } catch (err) {
            console.error('[Job] ❌ Cron job failed:', err.message);
        }
    });
}

export { runAnalysisForUser, runAnalysisForAllUsers };
