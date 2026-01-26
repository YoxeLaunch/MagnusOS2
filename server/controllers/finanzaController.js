import {
    LedgerTransaction,
    TransactionLine,
    Category,
    Account,
    fromMinorUnits,
    User,
    sequelize
} from '../models/index.js';
import { CurrencyHistory } from '../models/index.js';

// --- TRANSACTIONS (Budget/Recurring) ---
export const getTransactions = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId || userId === 'undefined') return res.json([]);

        // Using legacy Transaction model for Budget/Recurring items
        // We just migrated these from SQLite 'Transactions' to Postgres 'Transactions'
        const { Transaction } = await import('../models/index.js');

        const transactions = await Transaction.findAll({
            where: { userId },
            order: [['date', 'DESC']]
        });

        // Safety Clean-up
        const cleanTransactions = transactions.map(t => {
            // Ensure deductions is a valid object if string or null
            let cleanDeductions = t.deductions;

            // Note: Sequelize with DataTypes.JSON usually returns object or null.
            // But if it returns string (legacy), we parse it.
            // We handled this in migration, but being double safe here.
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
                deductions: cleanDeductions
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
        const { Transaction } = await import('../models/index.js');
        const transaction = await Transaction.create(req.body);
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateTransaction = async (req, res) => {
    try {
        const { Transaction } = await import('../models/index.js');
        const { id } = req.params;
        const [updated] = await Transaction.update(req.body, { where: { id } });
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
        const { Transaction } = await import('../models/index.js');
        const { id } = req.params;
        const deleted = await Transaction.destroy({ where: { id } });
        if (deleted) res.status(204).send();
        else res.status(404).json({ error: 'Not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- DAILY TRANSACTIONS ---
export const getDailyTransactions = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId || userId === 'undefined') return res.json([]);

        const transactions = await LedgerTransaction.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: TransactionLine,
                    as: 'lines',
                    include: [
                        { model: Category, as: 'category' },
                        { model: Account, as: 'account' }
                    ]
                }
            ],
            order: [['date', 'DESC']]
        });

        const mapped = transactions.map(tx => {
            // Logic:
            // For an expense: Account Line is Negative (-100), Category Line is Positive (+100).
            // Legacy Amount was positive 100 with type 'expense'.

            const categoryLine = tx.lines.find(l => l.categoryId); // The "Why"
            const accountLine = tx.lines.find(l => l.accountId);   // The "Where"

            // If we can't find a category line (e.g. transfer), use the account line
            const rawAmount = accountLine ? accountLine.amountMinor : 0n; // amountMinor is BIGINT (string or specialized obj in JS depending on pg driver)
            // wait, fromMinorUnits likely handles bigints or numbers. 
            // Sequelize returns BIGINT as string usually.

            // To be safe, convert to number if it's string
            const absAmount = fromMinorUnits(Math.abs(Number(rawAmount)));

            return {
                id: tx.id,
                date: tx.date, // YYYY-MM-DD
                concept: tx.payeeName || tx.memo || 'Transaction', // payee_name -> payeeName
                amount: absAmount,
                type: tx.type, // 'income' or 'expense'
                category: categoryLine?.category?.name || 'Uncategorized',
                currency: accountLine?.currency || 'DOP',
                paymentMethod: accountLine?.account?.name || 'Cash', // Legacy 'paymentMethod' was usually Account Name
                notes: tx.memo || '',
                userId: tx.userId // user_id -> userId
            };
        });

        res.json(mapped);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

export const createDailyTransaction = async (req, res) => {
    try {
        const transaction = await DailyTransaction.create(req.body);
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateDailyTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await DailyTransaction.update(req.body, { where: { id } });
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
        await DailyTransaction.destroy({ where: { id } });
        res.status(204).send();
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

        res.json({
            usd: usdRate,
            eur: eurRate,
            trends: { usd: usdTrend, eur: eurTrend }
        });
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
