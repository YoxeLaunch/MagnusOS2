import { DailyTransaction } from '../models/index.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const SANDBOX_URL = process.env.SANDBOX_URL || 'http://sandbox:5000';
const MODEL = 'qwen2:0.5b';

/**
 * AI Controller - Autonomous Finance Analytics
 */
export const chat = async (req, res) => {
    try {
        const { message, userId } = req.body;
        console.log(`[AI] Request from ${userId}: "${message}"`);

        // 1. Get Context (Recent Transactions) - Increased for monthly analysis
        let recentTx = [];
        try {
            recentTx = await DailyTransaction.findAll({
                where: { userId },
                limit: 40,
                order: [['date', 'DESC']]
            });
        } catch (dbErr) {
            console.error('[AI DB ERROR]', dbErr.message);
        }

        const context = recentTx.map(t => `${t.date}: ${t.description} (${t.amount})`).join('\n');
        console.log(`[AI] Context size: ${recentTx.length} items`);

        // 2. Prepare Payload
        const system = "Eres el Analista Financiero de MagnusOS. Tienes acceso a los datos reales arriba. Responde SIEMPRE basándote en ellos de forma breve y profesional en español. 'soberano' es el usuario.";
        const prompt = `DATOS DE TRANSACCIONES:
${context || 'No hay transacciones registradas.'}

PREGUNTA DEL USUARIO: "${message}"`;

        console.log(`[AI DEBUG] PROMPT SENT:\n${prompt}`);

        // 3. Call Ollama
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s

        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                system,
                prompt,
                stream: false,
                options: {
                    num_predict: 300,
                    temperature: 0.1
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`[AI DEBUG] RESPONSE RECEIVED: "${data.response}"`);
        res.json({ response: data.response });

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[AI TIMEOUT] Ollama took too long (>120s).');
            res.status(504).json({ error: 'La IA está tardando demasiado debido a recursos limitados del servidor.' });
        } else {
            console.error('[AI ERROR]', error.message);
            res.status(500).json({ error: 'Error en el analista IA.', details: error.message });
        }
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
