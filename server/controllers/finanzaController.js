import crypto from 'node:crypto';
import {
    DailyTransaction,
    CurrencyHistory,
    Transaction,
    Account,
    LedgerTransaction,
    TransactionLine,
    Category,
    toMinorUnitsBigInt,
    fromMinorUnits,
    sequelize
} from '../models/index.js';
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
                amount: fromMinorUnits(t.amountMinor),
                amountMinor: String(t.amountMinor),
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

        const transaction = await Transaction.findOne({ where });
        if (!transaction) return res.status(404).json({ error: 'Not found' });
        await transaction.update(data);
        res.json(transaction);
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
            amount: fromMinorUnits(tx.amountMinor),
            amountMinor: String(tx.amountMinor),
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
    const t = await sequelize.transaction();
    try {
        const userId = getEffectiveUserId(req, req.body.userId);
        const { date, amount, amountMinor, description, type = 'expense', category = 'Varios', currency = 'DOP' } = req.body;

        let minorBigInt;
        try {
            minorBigInt = amountMinor !== undefined ? BigInt(String(amountMinor)) : toMinorUnitsBigInt(amount);
        } catch {
            await t.rollback();
            return res.status(400).json({ error: 'Importe numérico inválido' });
        }

        if (minorBigInt === 0n) {
            await t.rollback();
            return res.status(400).json({ error: 'El importe contable no puede ser cero' });
        }

        const absMinor = minorBigInt < 0n ? -minorBigInt : minorBigInt;
        const legacyType = (type || 'expense').toLowerCase();
        const isPositiveToAccount = legacyType === 'income' || legacyType === 'refund';
        const accountDelta = isPositiveToAccount ? absMinor : -absMinor;
        const categoryDelta = -accountDelta;

        let account = await Account.findOne({
            where: { userId, currency, isArchived: false },
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        if (!account) {
            account = await Account.create({
                userId,
                name: 'Efectivo',
                type: 'cash',
                currency,
                openingBalanceMinor: 0n,
                currentBalanceMinor: 0n
            }, { transaction: t });
        }

        const categoryType = legacyType === 'income' ? 'income' : 'expense';
        let [cat] = await Category.findOrCreate({
            where: { userId, name: category },
            defaults: { userId, name: category, type: categoryType },
            transaction: t
        });

        const legacyData = {
            ...req.body,
            userId,
            date: date || new Date().toISOString().split('T')[0],
            amount: fromMinorUnits(minorBigInt),
            amountMinor: minorBigInt.toString(),
            type: legacyType,
            category: category,
            description: description || 'Registro diario'
        };
        const legacyRow = await DailyTransaction.create(legacyData, { transaction: t });

        const ledgerTx = await LedgerTransaction.create({
            userId,
            date: legacyData.date,
            payeeName: (description || category).slice(0, 100),
            memo: `DailyTransaction #${legacyRow.id}: ${description || ''}`.trim(),
            status: 'cleared',
            type: legacyType === 'investment' ? 'investment' : (legacyType === 'income' ? 'income' : 'expense'),
            reference: `migrated:daily:${legacyRow.id}`
        }, { transaction: t });

        await TransactionLine.create({
            transactionId: ledgerTx.id,
            accountId: account.id,
            amountMinor: accountDelta.toString(),
            currency,
            memo: description || ''
        }, { transaction: t });

        await TransactionLine.create({
            transactionId: ledgerTx.id,
            categoryId: cat.id,
            amountMinor: categoryDelta.toString(),
            currency,
            memo: category || ''
        }, { transaction: t });

        const currentAccMinor = BigInt(account.currentBalanceMinor || 0);
        await account.update({
            currentBalanceMinor: (currentAccMinor + accountDelta).toString()
        }, { transaction: t });

        try {
            const legacyHash = crypto.createHash('sha256').update(`${legacyData.date}|${legacyData.amount}|${description}`).digest('hex').substring(0, 16);
            await sequelize.query(`
                INSERT INTO legacy_daily_transaction_mappings 
                (daily_transaction_id, ledger_transaction_id, user_id, legacy_hash, status, notes)
                VALUES ($1, $2, $3, $4, 'migrated', 'Created via adapted daily API')
                ON CONFLICT (daily_transaction_id) DO NOTHING;
            `, {
                bind: [legacyRow.id, ledgerTx.id, userId, legacyHash],
                transaction: t
            });
        } catch (_) {}

        await t.commit();
        res.status(201).json(legacyRow);
    } catch (error) {
        await t.rollback();
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

        const transaction = await DailyTransaction.findOne({ where });
        if (!transaction) return res.status(404).json({ error: 'Not found' });
        await transaction.update(data);
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteDailyTransaction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const userId = getEffectiveUserId(req);
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) where.userId = userId;

        const legacyRow = await DailyTransaction.findOne({ where, transaction: t });
        if (!legacyRow) {
            await t.rollback();
            return res.status(404).json({ error: 'Not found' });
        }

        let ledgerTxId = null;
        try {
            const [mapping] = await sequelize.query(
                `SELECT ledger_transaction_id FROM legacy_daily_transaction_mappings WHERE daily_transaction_id = $1 LIMIT 1;`,
                { bind: [id], transaction: t }
            );
            if (mapping.length > 0 && mapping[0].ledger_transaction_id) {
                ledgerTxId = mapping[0].ledger_transaction_id;
            }
        } catch (_) {}

        if (!ledgerTxId) {
            const ref = `migrated:daily:${id}`;
            const foundLedger = await LedgerTransaction.findOne({ where: { reference: ref }, transaction: t });
            if (foundLedger) ledgerTxId = foundLedger.id;
        }

        if (ledgerTxId) {
            const ledgerTx = await LedgerTransaction.findByPk(ledgerTxId, {
                include: [{ model: TransactionLine, as: 'lines' }],
                transaction: t
            });
            if (ledgerTx) {
                for (const line of ledgerTx.lines) {
                    if (line.accountId) {
                        const acc = await Account.findByPk(line.accountId, { transaction: t, lock: t.LOCK.UPDATE });
                        if (acc) {
                            const cur = BigInt(acc.currentBalanceMinor || 0);
                            const lineDelta = BigInt(line.amountMinor || 0);
                            await acc.update({
                                currentBalanceMinor: (cur - lineDelta).toString()
                            }, { transaction: t });
                        }
                    }
                }
                await ledgerTx.destroy({ transaction: t });
            }
            try {
                await sequelize.query(`DELETE FROM legacy_daily_transaction_mappings WHERE daily_transaction_id = $1;`, {
                    bind: [id],
                    transaction: t
                });
            } catch (_) {}
        }

        await legacyRow.destroy({ transaction: t });
        await t.commit();
        res.status(204).send();
    } catch (error) {
        await t.rollback();
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
