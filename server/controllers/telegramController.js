import { User } from '../models/index.js';
import { LedgerAnalyticsService } from '../services/ledgerAnalyticsService.js';
import TelegramLink from '../models/TelegramLink.js';
import bcrypt from 'bcryptjs';
import { fromMinorUnits } from '../models/account.js';

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

        // Get ledger financial summary
        const summary = await LedgerAnalyticsService.getTelegramSummary({ userId: username });

        // Format the report
        const report = {
            success: true,
            user: user.name || username,
            summary: {
                totalIncome: summary.totalIncome,
                totalExpenses: summary.totalExpenses,
                balance: summary.balance,
                totalInvested: summary.totalInvested,
                netCashFlow: summary.netCashFlow,
                transactionCount: summary.transactionCount,
                accountCount: summary.accountCount
            },
            formattedMessage: `
📊 *REPORTE FINANCIERO OFICIAL (LEDGER)*
━━━━━━━━━━━━━━━━━━━━━
👤 Usuario: ${user.name || username}

📈 *Resumen Ledger (Contabilidad Oficial)*
• Ingresos: +RD$ ${summary.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Gastos: -RD$ ${summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Inversiones: RD$ ${summary.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Flujo de Caja Neto: RD$ ${summary.netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Balance Total en Cuentas: RD$ ${summary.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}

🏦 Cuentas activas: ${summary.accountCount}
📝 Asientos contables: ${summary.transactionCount}
━━━━━━━━━━━━━━━━━━━━━
_Datos verificados por partida doble en PostgreSQL_
            `.trim()
        };

        res.json(report);
    } catch (error) {
        console.error('[Telegram Report Error]:', error);
        res.status(500).json({ success: false, message: 'Error generando reporte' });
    }
};
