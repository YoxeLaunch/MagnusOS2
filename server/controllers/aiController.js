import { DailyTransaction } from '../models/index.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    getSnapshot,
    saveSnapshot,
    getLatestSnapshot,
    isStale
} from '../services/snapshotService.js';

// ========================================
// Configuration
// ========================================
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const SANDBOX_URL = process.env.SANDBOX_URL || 'http://sandbox:5000';
const OLLAMA_MODEL = 'qwen2:0.5b';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini if key is available
let genAI = null;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// ========================================
// Circuit Breaker State (in-memory)
// For production: migrate to Redis
// ========================================
let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 3;
let circuitBreakerOpen = false;

// ========================================
// Rate Limiter State (in-memory)
// For production: migrate to Redis
// ========================================
const deepCallCounts = new Map(); // userId -> { count, date }

const checkRateLimit = (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const entry = deepCallCounts.get(userId);
    if (!entry || entry.date !== today) {
        deepCallCounts.set(userId, { count: 1, date: today });
        return true; // allowed
    }
    if (entry.count >= 10) {
        return false; // blocked
    }
    entry.count++;
    return true; // allowed
};

// ========================================
// Context Builders — One per mode
// ========================================

// ========================================
// Currency config — DOP (Dominican Peso)
// ========================================
const DOP_TO_USD = parseFloat(process.env.DOP_TO_USD_RATE || '0.01695'); // ~59 DOP = 1 USD

// ========================================
// Utility: Compute metrics from transactions
// ========================================
const computeMetrics = (transactions) => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryMap = {};

    for (const tx of transactions) {
        const amount = parseFloat(tx.amount) || 0;
        // Use the 'type' field: 'income' | 'expense'
        const isExpense = (tx.type === 'expense') || (tx.type === 'gasto');
        const isIncome = (tx.type === 'income') || (tx.type === 'ingreso');
        const cat = tx.category || tx.description?.split(' ')[0] || 'Otros';

        if (isIncome) {
            totalIncome += amount;
        } else if (isExpense) {
            totalExpenses += amount;
            categoryMap[cat] = (categoryMap[cat] || 0) + amount;
        } else {
            // Fallback: use sign
            if (amount >= 0) totalIncome += amount;
            else { totalExpenses += Math.abs(amount); categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(amount); }
        }
    }

    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

    const topCategories = Object.entries(categoryMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount: amount.toFixed(2) }));

    return {
        // DOP values (native)
        totalIncome: totalIncome.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        balance: balance.toFixed(2),
        savingsRate: parseFloat(savingsRate),
        topCategories,
        txCount: transactions.length,
        currency: 'DOP',
        // USD equivalents
        totalIncomeUSD: (totalIncome * DOP_TO_USD).toFixed(2),
        totalExpensesUSD: (totalExpenses * DOP_TO_USD).toFixed(2),
        balanceUSD: (balance * DOP_TO_USD).toFixed(2),
        exchangeRate: DOP_TO_USD
    };
};

/**
 * Mode 'chat': Lightweight context — only last 3 transactions.
 * ~250 tokens. Ideal for conversational messages ("Hola", "¿cuánto tengo?")
 */
const buildChatContext = async (userId, message, history = []) => {
    let recentTx = [];
    try {
        recentTx = await DailyTransaction.findAll({
            where: { userId },
            limit: 3,
            order: [['date', 'DESC']]
        });
    } catch (e) {
        console.error('[AI] DB error in chat context:', e.message);
    }

    const txContext = recentTx.length > 0
        ? recentTx.map(t => `${t.date}: ${t.description} (${t.amount})`).join('\n')
        : 'Sin transacciones recientes.';

    const historyContext = history.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n');

    const systemPrompt = `Eres el Analista Financiero de MagnusOS. Responde de forma breve y natural en español. 
Si el usuario solo saluda, saluda de vuelta. No finjas analizar datos si no te los preguntan.
Últimas 3 transacciones del usuario para contexto rápido:
${txContext}
${historyContext ? `\nHistorial reciente de la conversación:\n${historyContext}` : ''}`;

    console.log(`[AI] Context-Mode: chat | Context-Size: ${recentTx.length} tx | Tokens: ~200-300`);
    return { systemPrompt, userPrompt: message };
};

/**
 * Mode 'quick': Monthly snapshot + last 10 transactions.
 * ~800 tokens. For "Resumen del mes" type questions.
 */
const buildQuickContext = async (userId, message, period) => {
    // Try to serve from cached snapshot first
    const snapshot = await getSnapshot(period);
    let metricsContext = '';

    if (snapshot && !isStale(snapshot)) {
        const m = snapshot.computed_metrics || {};
        metricsContext = `RESUMEN MENSUAL PRECALCULADO (${snapshot.period}):
- Ingresos: ${m.totalIncome || 'N/A'}
- Gastos: ${m.totalExpenses || 'N/A'}
- Balance: ${m.balance || 'N/A'}
- Tasa de ahorro: ${m.savingsRate || 'N/A'}%
- Categorías principales: ${JSON.stringify(m.topCategories || [])}`;
        console.log(`[AI] Context-Mode: quick | Source: cached-snapshot | Period: ${snapshot.period}`);
    } else {
        // No snapshot, use last 10 transactions
        let recentTx = [];
        try {
            recentTx = await DailyTransaction.findAll({
                where: { userId },
                limit: 10,
                order: [['date', 'DESC']]
            });
        } catch (e) {
            console.error('[AI] DB error in quick context:', e.message);
        }
        metricsContext = recentTx.map(t => `${t.date}: ${t.description} (${t.amount})`).join('\n');
        console.log(`[AI] Context-Mode: quick | Source: live-db | Context-Size: ${recentTx.length} tx`);
    }

    const systemPrompt = `Eres el Analista Financiero de MagnusOS. Responde en español de forma profesional y detallada.
Aquí tienes el resumen del período para análisis:
${metricsContext}`;

    return { systemPrompt, userPrompt: message };
};

/**
 * Mode 'deep': Full snapshot or full 300 tx analysis.
 * ~4,500–6,000 tokens. Only on explicit user request.
 * Returns cached data if snapshot exists — 0 additional Gemini calls.
 */
const buildDeepContext = async (userId, message, period) => {
    // Check for fresh cached snapshot first
    const snapshot = await getSnapshot(period);
    if (snapshot && !isStale(snapshot)) {
        console.log(`[AI] Context-Mode: deep | Source: cached-snapshot (0 tokens!) | Period: ${snapshot.period}`);
        return { cached: true, snapshot };
    }

    // No snapshot or stale — go full analysis
    let recentTx = [];
    try {
        recentTx = await DailyTransaction.findAll({
            where: { userId },
            limit: 300,
            order: [['date', 'DESC']]
        });
    } catch (e) {
        console.error('[AI] DB error in deep context:', e.message);
    }

    const txContext = recentTx.map(t =>
        `${t.date} | ${t.type === 'income' ? '+' : '-'}RD$${t.amount} | ${t.category || 'Sin cat'} | ${t.description}`
    ).join('\n');
    console.log(`[AI] Context-Mode: deep | Source: live-db | Context-Size: ${recentTx.length} tx`);

    const computed_metrics = computeMetrics(recentTx);
    const usdRate = DOP_TO_USD;

    const systemPrompt = `Eres el Analista Financiero Senior de MagnusOS. Los montos están en Pesos Dominicanos (RD$).
Anota siempre los valores en RD$ primero y entre paréntesis el equivalente en USD (tasa: 1 USD ≈ ${(1/usdRate).toFixed(0)} RD$).
Métricas precalculadas del período:
- Ingresos: RD$${computed_metrics.totalIncome} (~US$${computed_metrics.totalIncomeUSD})
- Gastos: RD$${computed_metrics.totalExpenses} (~US$${computed_metrics.totalExpensesUSD})
- Balance: RD$${computed_metrics.balance} (~US$${computed_metrics.balanceUSD})
- Tasa de ahorro: ${computed_metrics.savingsRate}%
- Total transacciones: ${computed_metrics.txCount}

Incluye: resumen ejecutivo, análisis por categoría, patrones de gasto, alertas críticas y recomendaciones accionables.
Usa markdown con encabezados ##, listas, tablas y negritas para máxima legibilidad. El usuario se llama 'soberano'.

TRANSACCIONES (${recentTx.length} registros, formato: fecha | monto | categoría | descripción):
${txContext || 'No hay transacciones registradas.'}`;

    return { cached: false, systemPrompt, userPrompt: message, computed_metrics };
};

// ========================================
// Main Chat Handler
// ========================================
export const chat = async (req, res) => {
    try {
        const { message, userId, mode = 'chat', period, history = [] } = req.body;
        console.log(`[AI] Request | User: ${userId} | Mode: ${mode} | Message: "${message.substring(0, 50)}"`);

        // --- Rate Limiter (deep mode only) ---
        if (mode === 'deep' && !checkRateLimit(userId)) {
            return res.status(429).json({
                error: 'Límite de análisis profundo alcanzado (10/día). Inténtalo mañana.',
                retryAfter: 'tomorrow'
            });
        }

        // --- Circuit Breaker Check ---
        if (circuitBreakerOpen) {
            console.warn('[AI] Circuit breaker is OPEN — serving cached snapshot.');
            const latestSnapshot = await getLatestSnapshot();
            if (latestSnapshot) {
                return res.json({
                    response: latestSnapshot.gemini_narrative || 'No hay narrativa disponible.',
                    offline: true,
                    cached: true,
                    period: latestSnapshot.period,
                    metrics: latestSnapshot.computed_metrics || {}
                });
            }
            return res.status(503).json({ error: 'Servicio de IA temporalmente no disponible.', offline: true });
        }

        // --- Build context ONCE based on mode ---
        let contextResult;
        if (mode === 'quick') {
            contextResult = await buildQuickContext(userId, message, period);
        } else if (mode === 'deep') {
            contextResult = await buildDeepContext(userId, message, period);
        } else {
            contextResult = await buildChatContext(userId, message, history);
        }

        // --- Serve from cache if available (deep mode only) ---
        if (contextResult.cached) {
            const s = contextResult.snapshot;
            const metrics = s.computed_metrics || {};
            const narrative = s.gemini_narrative || 'Análisis no disponible.';
            const alerts = (s.gemini_alerts || []);
            const recs = (s.gemini_recommendations || []);

            // Build a nice markdown response from cached parts
            let cachedResponse = '';
            if (narrative) cachedResponse += narrative + '\n\n';
            if (alerts.length) {
                cachedResponse += '### ⚠️ Alertas\n' + alerts.map((a, i) => `${i + 1}. ${a}`).join('\n') + '\n\n';
            }
            if (recs.length) {
                cachedResponse += '### ✅ Recomendaciones\n' + recs.map((r, i) => `${i + 1}. ${r}`).join('\n');
            }

            return res.json({
                response: cachedResponse,
                cached: true,
                period: s.period,
                metrics,
                tokens_used: s.tokens_used || 0
            });
        }

        const fullPrompt = `${contextResult.systemPrompt}\n\nPREGUNTA: ${contextResult.userPrompt}`;

        // --- Call Gemini (or Ollama fallback) ---
        if (genAI) {
            const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await geminiModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    maxOutputTokens: mode === 'deep' ? 8192 : mode === 'quick' ? 2048 : 800,
                    temperature: mode === 'chat' ? 0.3 : 0.2,
                }
            });

            const responseText = result.response.text();
            const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
            console.log(`[AI] Gemini OK | Mode: ${mode} | Tokens: ${tokensUsed}`);

            // Circuit Breaker — reset on success
            consecutiveFailures = 0;
            circuitBreakerOpen = false;

            // If deep mode, save snapshot so next request is free
            if (mode === 'deep') {
                const periodKey = period || new Date().toISOString().substring(0, 7);
                const metricsToSave = contextResult.computed_metrics || {};
                try {
                    await saveSnapshot(periodKey, metricsToSave, {
                        narrative: responseText,
                        alerts: [],
                        recommendations: [],
                        tokensUsed
                    });
                    console.log(`[AI] Snapshot saved for period ${periodKey} | metrics: ${JSON.stringify(metricsToSave)}`);
                } catch (saveErr) {
                    console.error('[AI] Failed to save snapshot cache:', saveErr.message);
                }
            }

            return res.json({
                response: responseText,
                mode,
                tokens_used: tokensUsed,
                metrics: contextResult.computed_metrics || null,
                cached: false,
                period: period || new Date().toISOString().substring(0, 7)
            });
        }

        // --- FALLBACK TO OLLAMA ---
        console.log('[AI] Using Ollama Engine (Fallback)...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                system: contextResult.systemPrompt,
                prompt: contextResult.userPrompt,
                stream: false,
                options: { num_predict: 300, temperature: 0.1 }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return res.json({ response: data.response, mode });

    } catch (error) {
        // --- Circuit Breaker — count failures ---
        if (genAI) {
            consecutiveFailures++;
            if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
                circuitBreakerOpen = true;
                console.error(`[AI] ⚡ Circuit breaker ACTIVATED after ${consecutiveFailures} consecutive failures.`);
            }
        }

        if (error.name === 'AbortError') {
            console.error('[AI] TIMEOUT — Engine took too long.');
            return res.status(504).json({ error: 'La IA está tardando demasiado. Intenta con modo "Chat" normal.' });
        }

        console.error('[AI ERROR]', error.message);
        return res.status(500).json({ error: 'Error en el analista IA.', details: error.message });
    }
};

/**
 * Execute code in Sandbox
 */
export const analyze = async (req, res) => {
    try {
        const { code } = req.body;
        const response = await fetch(`${SANDBOX_URL}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('[SANDBOX ERROR]', error.message);
        res.status(500).json({ error: 'Error al ejecutar análisis en el sandbox.' });
    }
};

/**
 * List available monthly snapshots (for DeepAnalysisPanel period selector)
 */
export const listSnapshots = async (req, res) => {
    try {
        const { listSnapshots: listFn } = await import('../services/snapshotService.js');
        const snapshots = await listFn(24);
        res.json({ snapshots });
    } catch (error) {
        console.error('[AI] Error listing snapshots:', error.message);
        res.status(500).json({ error: 'Error al listar snapshots.' });
    }
};

/**
 * Get a single snapshot by ID (for viewing detail)
 */
export const getSnapshotById = async (req, res) => {
    try {
        const { MonthlySnapshot } = await import('../models/monthlySnapshot.js');
        const snap = await MonthlySnapshot.findByPk(req.params.id);
        if (!snap) return res.status(404).json({ error: 'Snapshot no encontrado.' });
        res.json({ snapshot: snap });
    } catch (error) {
        console.error('[AI] Error getting snapshot:', error.message);
        res.status(500).json({ error: 'Error al obtener snapshot.' });
    }
};

/**
 * Delete a snapshot by ID
 */
export const deleteSnapshot = async (req, res) => {
    try {
        const { MonthlySnapshot } = await import('../models/monthlySnapshot.js');
        const snap = await MonthlySnapshot.findByPk(req.params.id);
        if (!snap) return res.status(404).json({ error: 'Snapshot no encontrado.' });
        await snap.destroy();
        console.log(`[AI] Snapshot deleted: id=${req.params.id} period=${snap.period}`);
        res.json({ ok: true, message: `Reporte de ${snap.period} eliminado.` });
    } catch (error) {
        console.error('[AI] Error deleting snapshot:', error.message);
        res.status(500).json({ error: 'Error al eliminar snapshot.' });
    }
};

