import { User, Transaction, DailyTransaction } from '../models/index.js';
import TelegramLink from '../models/TelegramLink.js';
import bcrypt from 'bcryptjs';

/**
 * Link a Telegram chat ID to a Magnus username
 * POST /api/telegram/link
 * Body: { chatId, username, password }
 */
export const linkUser = async (req, res) => {
    try {
        let { chatId, username, password } = req.body;

        // Ensure chatId is always a string
        chatId = String(chatId);

        if (!chatId || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere chatId, username y password'
            });
        }

        // Verify user exists and password is correct
        const user = await User.findByPk(username);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        // Create or update the link
        const [link, created] = await TelegramLink.findOrCreate({
            where: { chatId },
            defaults: { chatId, username }
        });

        if (!created) {
            await link.update({ username, linkedAt: new Date() });
        }

        res.json({
            success: true,
            message: `✅ Cuenta vinculada exitosamente a ${user.name || username}`
        });
    } catch (error) {
        console.error('[Telegram Link Error]:', error);
        res.status(500).json({ success: false, message: 'Error al vincular cuenta' });
    }
};

/**
 * Unlink a Telegram chat ID
 * POST /api/telegram/unlink
 * Body: { chatId }
 */
export const unlinkUser = async (req, res) => {
    try {
        let { chatId } = req.body;
        chatId = String(chatId);

        const deleted = await TelegramLink.destroy({ where: { chatId } });

        if (deleted) {
            res.json({ success: true, message: '✅ Cuenta desvinculada' });
        } else {
            res.status(404).json({ success: false, message: 'No hay cuenta vinculada' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al desvincular' });
    }
};

/**
 * Get financial report for a linked Telegram user
 * GET /api/telegram/report/:chatId
 */
export const getReport = async (req, res) => {
    try {
        let { chatId } = req.params;
        chatId = String(chatId);

        // Find the linked user
        const link = await TelegramLink.findOne({ where: { chatId } });
        if (!link) {
            return res.status(404).json({
                success: false,
                message: '❌ No tienes cuenta vinculada. Usa /vincular usuario contraseña'
            });
        }

        const username = link.username;

        // Get user info
        const user = await User.findByPk(username, {
            attributes: ['username', 'name']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado en el sistema'
            });
        }

        // Get transactions summary
        const transactions = await Transaction.findAll({ where: { userId: username } });
        const dailyTransactions = await DailyTransaction.findAll({ where: { userId: username } });

        // Calculate totals
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const dailyTotal = dailyTransactions
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        // Format the report
        const report = {
            success: true,
            user: user.name || username,
            summary: {
                totalIncome,
                totalExpenses,
                balance: totalIncome - totalExpenses,
                dailyTracking: dailyTotal,
                transactionCount: transactions.length,
                dailyCount: dailyTransactions.length
            },
            formattedMessage: `
📊 *REPORTE FINANCIERO*
━━━━━━━━━━━━━━━━━━━━━
👤 Usuario: ${user.name || username}

📈 *Resumen*
• Ingresos: +$${totalIncome.toLocaleString()}
• Gastos: -$${totalExpenses.toLocaleString()}
• Balance: $${(totalIncome - totalExpenses).toLocaleString()}

📅 *Seguimiento Diario*
• Total: $${dailyTotal.toLocaleString()}
• Registros: ${dailyTransactions.length}

📝 Transacciones totales: ${transactions.length}
━━━━━━━━━━━━━━━━━━━━━
            `.trim()
        };

        res.json(report);
    } catch (error) {
        console.error('[Telegram Report Error]:', error);
        res.status(500).json({ success: false, message: 'Error generando reporte' });
    }
};
