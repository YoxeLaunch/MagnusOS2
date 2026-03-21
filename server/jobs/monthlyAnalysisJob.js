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
import { DailyTransaction } from '../models/index.js';
import { initDb } from '../models/index.js';
import { saveSnapshot, getSnapshot, isStale } from '../services/snapshotService.js';
import { Op } from 'sequelize';

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
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryMap = {};

    for (const tx of transactions) {
        const amount = parseFloat(tx.amount) || 0;
        const desc = tx.description || 'Sin categoría';

        if (amount > 0) {
            totalIncome += amount;
        } else {
            totalExpenses += Math.abs(amount);
            const cat = desc.split(' ')[0] || 'Otros'; // Simple categorization
            categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(amount);
        }
    }

    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

    // Top 5 categories by expense
    const topCategories = Object.entries(categoryMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount: amount.toFixed(2) }));

    return {
        totalIncome: totalIncome.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        balance: balance.toFixed(2),
        savingsRate: parseFloat(savingsRate),
        topCategories,
        txCount: transactions.length
    };
};

// ========================================
// Core: Run the monthly analysis for a period
// ========================================
const runAnalysisForPeriod = async (period) => {
    const { startDate, endDate, periodKey } = getPeriodRange(period);
    console.log(`[Job] ▶ Starting monthly analysis for: ${periodKey} (${startDate} → ${endDate})`);

    // STEP 1: Check if snapshot already exists and is fresh
    if (!isForced) {
        const existing = await getSnapshot(periodKey);
        if (existing && !isStale(existing)) {
            console.log(`[Job] ⏭ Snapshot already exists and is fresh for ${periodKey}. Skipping.`);
            return existing;
        }
    }

    // STEP 2: Query all transactions for the period
    let transactions = [];
    try {
        transactions = await DailyTransaction.findAll({
            where: {
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['date', 'ASC']]
        });
        console.log(`[Job] Fetched ${transactions.length} transactions from DB.`);
    } catch (err) {
        console.error('[Job] DB query error:', err.message);
        throw err;
    }

    if (transactions.length === 0) {
        console.log(`[Job] No transactions found for ${periodKey}. Saving empty snapshot.`);
        await saveSnapshot(periodKey, { txCount: 0 }, {
            narrative: 'No se registraron transacciones en este período.',
            alerts: [],
            recommendations: [],
            tokensUsed: 0
        });
        return;
    }

    // STEP 3: Compute metrics in Node.js (no token cost)
    const metrics = computeMetrics(transactions);
    console.log(`[Job] Metrics computed:`, metrics);

    // STEP 4: Call Gemini ONCE with compressed summary
    let geminiResponse = {
        narrative: 'Análisis no disponible (Gemini no configurado).',
        alerts: [],
        recommendations: [],
        tokensUsed: 0
    };

    if (genAI) {
        const prompt = `Eres un analista financiero. Analiza este resumen mensual de MagnusOS y genera:

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

            // Parse JSON from Gemini response
            try {
                const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
                const parsed = JSON.parse(cleaned);
                geminiResponse = {
                    narrative: parsed.narrative || '',
                    alerts: parsed.alerts || [],
                    recommendations: parsed.recommendations || [],
                    tokensUsed
                };
                console.log(`[Job] ✅ Gemini analysis complete. Tokens used: ${tokensUsed}`);
            } catch (parseErr) {
                console.error('[Job] Failed to parse Gemini JSON. Saving raw text as narrative.');
                geminiResponse.narrative = responseText.substring(0, 1000);
                geminiResponse.tokensUsed = tokensUsed;
            }
        } catch (geminiErr) {
            console.error('[Job] Gemini API error:', geminiErr.message);
            geminiResponse.narrative = `Error al generar análisis narrativo: ${geminiErr.message}`;
        }
    } else {
        console.warn('[Job] GEMINI_API_KEY not set. Saving metrics-only snapshot.');
    }

    // STEP 5: Save snapshot to PostgreSQL
    const savedSnapshot = await saveSnapshot(periodKey, metrics, geminiResponse);
    console.log(`[Job] ✅ Snapshot saved for ${periodKey} | tokens_used: ${geminiResponse.tokensUsed}`);
    return savedSnapshot;
};

// ========================================
// Manual trigger
// ========================================
if (isForced) {
    console.log(`[Job] 🔧 MANUAL TRIGGER — Period: ${periodArg || 'last month'}`);

    const bootstrap = async () => {
        try {
            await initDb();
            await runAnalysisForPeriod(periodArg);
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
            await runAnalysisForPeriod(null); // null = last month
        } catch (err) {
            console.error('[Job] ❌ Cron job failed:', err.message);
        }
    });
}

export { runAnalysisForPeriod };
