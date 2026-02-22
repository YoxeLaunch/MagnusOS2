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

        // 1. Get Context (Recent Transactions)
        let recentTx = [];
        try {
            recentTx = await DailyTransaction.findAll({
                where: { userId },
                limit: 10,
                order: [['date', 'DESC']]
            });
        } catch (dbErr) {
            console.error('[AI DB ERROR]', dbErr.message);
        }

        const context = recentTx.map(t => `${t.date}: ${t.description} (${t.amount} DOP, ${t.type})`).join('\n');
        console.log(`[AI] Context: ${recentTx.length} transactions found.`);

        // 2. Format Prompt
        const prompt = `
Eres Magnus AI, un analista financiero experto. 
Transacciones del usuario:
${context || 'No hay transacciones.'}

Pregunta: "${message}"
Responde brevemente.
`.trim();

        // 3. Call Ollama with Timeout
        console.log(`[AI] Calling Ollama (${OLLAMA_URL}) with model ${MODEL}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                prompt,
                stream: false
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`[AI] Response received successfully.`);
        res.json({ response: data.response });

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[AI TIMEOUT] Ollama took too long.');
            res.status(504).json({ error: 'La IA tardó demasiado en responder.' });
        } else {
            console.error('[AI ERROR]', error.message);
            res.status(500).json({ error: 'Error interno en el analista IA.', details: error.message });
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
