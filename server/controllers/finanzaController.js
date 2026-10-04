import { DailyTransaction, CurrencyHistory, Transaction } from '../models/index.js';
import { getEffectiveUserId } from '../middleware/auth.js';

// --- RATES CACHE ---
let ratesCache = {
    data: null,
    timestamp: 0
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// --- TRANSACTIONS (Budget/Recurring) ---
export const getTransactions = async (req, res) => {
    try {
        const userId = getEffectiveUserId(req, req.query.userId);

        const transactions = await Transaction.findAll({
            where: { userId },
            order: [['date', 'DESC']]
        });

        // Safety Clean-up
        const cleanTransactions = transactions.map(t => {
            let cleanDeductions = t.deductions;
            if (typeof cleanDeductions === 'string') {
                try {
                    cleanDeductions = JSON.parse(cleanDeductions);
                } catch (e) {
                    cleanDeductions = undefined;
                }
            } else if (cleanDeductions === null) {
                cleanDeductions = undefined;
            }

            return {
                id: t.id,
                userId: t.userId,
                name: t.name || 'Sin Nombre',
                amount: Number(t.amount) || 0,
                frequency: t.frequency || 'Mensual',
                category: t.category || 'General',
                currency: t.currency || 'DOP',
                date: t.date,
                type: t.type,
                deductions: cleanDeductions,
                validFrom: t.validFrom,
                validTo: t.validTo,
                conceptId: t.conceptId
            };
        });

        res.json(cleanTransactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

export const createTransaction = async (req, res) => {
    try {
        const userId = getEffectiveUserId(req, req.body.userId);
        const data = { ...req.body, userId };
        const transaction = await Transaction.create(data);
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) where.userId = userId;

        const data = { ...req.body };
        delete data.userId;
        delete data.id;

        const [updated] = await Transaction.update(data, { where });
        if (updated) {
            const result = await Transaction.findOne({ where: { id } });
            res.json(result);
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) where.userId = userId;

        const deleted = await Transaction.destroy({ where });
        if (deleted) res.status(204).send();
        else res.status(404).json({ error: 'Not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- DAILY TRANSACTIONS ---
export const getDailyTransactions = async (req, res) => {
    try {
        const userId = getEffectiveUserId(req, req.query.userId);

        const transactions = await DailyTransaction.findAll({
            where: { userId },
            order: [['date', 'DESC'], ['id', 'DESC']]
        });

        const mapped = transactions.map(tx => ({
            id: tx.id,
            userId: tx.userId,
            date: tx.date, // YYYY-MM-DD
            amount: Number(tx.amount) || 0,
            description: tx.description || 'Sin descripción',
            type: tx.type,
            category: tx.category || 'Varios'
        }));

        res.json(mapped);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

export const createDailyTransaction = async (req, res) => {
    try {
        const userId = getEffectiveUserId(req, req.body.userId);
        const data = { ...req.body, userId };
        const transaction = await DailyTransaction.create(data);
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateDailyTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) where.userId = userId;

        const data = { ...req.body };
        delete data.userId;
        delete data.id;

        const [updated] = await DailyTransaction.update(data, { where });
        if (updated) {
            const result = await DailyTransaction.findOne({ where: { id } });
            res.json(result);
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteDailyTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) where.userId = userId;

        const deleted = await DailyTransaction.destroy({ where });
        if (deleted) res.status(204).send();
        else res.status(404).json({ error: 'Not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- RATES ---
const getTrend = (current, previous) => {
    if (!previous) return { trend: 'neutral', change: 0 };
    const diff = current - previous;
    return {
        trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
        change: parseFloat(Math.abs(diff).toFixed(2))
    };
};

export const getRates = async (req, res) => {
    try {
        const now = Date.now();
        if (ratesCache.data && (now - ratesCache.timestamp < CACHE_DURATION)) {
            return res.json(ratesCache.data);
        }

        const usdHistory = await CurrencyHistory.findAll({
            where: { code: 'USD' },
            order: [['date', 'DESC'], ['id', 'DESC']],
            limit: 2
        });
        const eurHistory = await CurrencyHistory.findAll({
            where: { code: 'EUR' },
            order: [['date', 'DESC'], ['id', 'DESC']],
            limit: 2
        });

        const usdRate = usdHistory[0]?.rate || 60.00;
        const eurRate = eurHistory[0]?.rate || 65.00;
        const usdTrend = getTrend(usdRate, usdHistory[1]?.rate);
        const eurTrend = getTrend(eurRate, eurHistory[1]?.rate);

        const responseData = {
            usd: usdRate,
            eur: eurRate,
            trends: { usd: usdTrend, eur: eurTrend }
        };

        ratesCache = {
            data: responseData,
            timestamp: now
        };

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateRates = async (req, res) => {
    try {
        const { usd, eur, username } = req.body;
        if (!username || username.toLowerCase() !== 'soberano') {
            return res.status(403).json({ error: 'Acceso Denegado' });
        }
        const today = new Date().toISOString().split('T')[0];
        if (usd) await CurrencyHistory.create({ date: today, code: 'USD', rate: usd });
        if (eur) await CurrencyHistory.create({ date: today, code: 'EUR', rate: eur });

        // Invalidate cache
        ratesCache.data = null;

        res.json({ success: true, message: 'Rates updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getRatesHistory = async (req, res) => {
    try {
        const history = await CurrencyHistory.findAll({
            order: [['date', 'DESC'], ['id', 'DESC']],
            limit: 50
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
