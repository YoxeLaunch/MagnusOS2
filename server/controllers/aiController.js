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

    const txContext = recentTx.map(t => `${t.date}: ${t.description} (${t.amount})`).join('\n');
    console.log(`[AI] Context-Mode: deep | Source: live-db | Context-Size: ${recentTx.length} tx`);

    const systemPrompt = `Eres el Analista Financiero Senior de MagnusOS. Analiza TODAS las transacciones con detalle exhaustivo.
Incluye: resumen ejecutivo, análisis de categorías, patrones de gasto, alertas críticas, y recomendaciones accionables.
Usa markdown con encabezados, listas y negritas para máxima legibilidad.
'soberano' es el usuario.

DATOS DE TRANSACCIONES COMPLETOS (${recentTx.length} registros):
${txContext || 'No hay transacciones registradas.'}`;

    return { cached: false, systemPrompt, userPrompt: message };
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
                    response: `⚠️ **Modo Offline** — Sirviendo análisis desde caché (${latestSnapshot.period}):\n\n${latestSnapshot.gemini_narrative || 'No hay narrativa disponible.'}`,
                    offline: true,
                    period: latestSnapshot.period
                });
            }
            return res.status(503).json({ error: 'Servicio de IA temporalmente no disponible.', offline: true });
        }

        // --- Deep mode: check for cached snapshot ---
        if (mode === 'deep') {
            const deepCtx = await buildDeepContext(userId, message, period);
            if (deepCtx.cached) {
                const s = deepCtx.snapshot;
                const narrative = s.gemini_narrative || 'Análisis no disponible.';
                const alerts = (s.gemini_alerts || []).map((a, i) => `${i + 1}. ${a}`).join('\n');
                const recs = (s.gemini_recommendations || []).map((r, i) => `${i + 1}. ${r}`).join('\n');
                const metrics = s.computed_metrics || {};

                let cachedResponse = `## 📊 Análisis Financiero — ${s.period}\n\n`;
                cachedResponse += `**Período:** ${s.period} | **Generado:** ${new Date(s.created_at).toLocaleDateString('es-ES')}\n\n`;
                cachedResponse += `### Métricas del Período\n`;
                cachedResponse += `- 💰 **Ingresos:** ${metrics.totalIncome || 'N/A'}\n`;
                cachedResponse += `- 💸 **Gastos:** ${metrics.totalExpenses || 'N/A'}\n`;
                cachedResponse += `- ⚖️ **Balance:** ${metrics.balance || 'N/A'}\n`;
                cachedResponse += `- 📈 **Tasa de Ahorro:** ${metrics.savingsRate || 'N/A'}%\n\n`;
                cachedResponse += `### Diagnóstico\n${narrative}\n\n`;
                if (alerts) cachedResponse += `### ⚠️ Alertas\n${alerts}\n\n`;
                if (recs) cachedResponse += `### ✅ Recomendaciones\n${recs}\n`;

                return res.json({
                    response: cachedResponse,
                    cached: true,
                    period: s.period,
                    tokens_used: s.tokens_used
                });
            }
        }

        // --- Build context based on mode ---
        let contextResult;
        if (mode === 'quick') {
            contextResult = await buildQuickContext(userId, message, period);
        } else if (mode === 'deep') {
            contextResult = await buildDeepContext(userId, message, period);
        } else {
            contextResult = await buildChatContext(userId, message, history);
        }

        const fullPrompt = `${contextResult.systemPrompt}\n\nPREGUNTA: ${contextResult.userPrompt}`;

        // --- Call Gemini (or Ollama fallback) ---
        if (genAI) {
            const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await geminiModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    maxOutputTokens: mode === 'deep' ? 4096 : mode === 'quick' ? 2048 : 800,
                    temperature: mode === 'chat' ? 0.3 : 0.2,
                }
            });

            const responseText = result.response.text();
            const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
            console.log(`[AI] Gemini OK | Mode: ${mode} | Tokens: ${tokensUsed}`);

            // Circuit Breaker — reset on success
            consecutiveFailures = 0;
            circuitBreakerOpen = false;

            // If deep mode and was live, save snapshot for caching
            if (mode === 'deep' && !contextResult.cached) {
                // Save a basic snapshot with the narrative for future cache hits
                try {
                    await saveSnapshot(period || new Date().toISOString().substring(0, 7), {}, {
                        narrative: responseText,
                        alerts: [],
                        recommendations: [],
                        tokensUsed
                    });
                } catch (saveErr) {
                    console.error('[AI] Failed to save snapshot cache:', saveErr.message);
                }
            }

            return res.json({ response: responseText, mode, tokens_used: tokensUsed });
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
        const snapshots = await listFn(12);
        res.json({ snapshots });
    } catch (error) {
        console.error('[AI] Error listing snapshots:', error.message);
        res.status(500).json({ error: 'Error al listar snapshots.' });
    }
};
