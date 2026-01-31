import { WealthSnapshot } from '../models/index.js';
import { Op } from 'sequelize';

export const getWealthHistory = async (req, res) => {
    try {
        const userId = req.query.userId || req.user?.username || 'system';
        const { limit = 12 } = req.query;

        const history = await WealthSnapshot.findAll({
            where: { userId },
            order: [['date', 'ASC']],
            // limit: parseInt(limit) // Optional: limit history
        });

        res.json(history);
    } catch (error) {
        console.error('Error fetching wealth history:', error);
        res.status(500).json({ error: 'Failed to fetch wealth history' });
    }
};

export const createWealthSnapshot = async (req, res) => {
    try {
        const userId = req.body.userId || req.user?.username || 'system';
        const { date, netWorth, assets, liabilities, breakdown, currency } = req.body;

        if (netWorth === undefined) {
            return res.status(400).json({ error: 'netWorth is required' });
        }

        // Check if snapshot already exists for this date
        const existing = await WealthSnapshot.findOne({
            where: { userId, date }
        });

        if (existing) {
            // Update existing
            await existing.update({ netWorth, assets, liabilities, breakdown, currency });
            return res.json(existing);
        }

        // Create new
        const snapshot = await WealthSnapshot.create({
            userId,
            date,
            netWorth,
            assets: assets || 0,
            liabilities: liabilities || 0,
            breakdown: breakdown || {},
            currency: currency || 'DOP'
        });

        res.json(snapshot);
    } catch (error) {
        console.error('Error creating wealth snapshot:', error);
        res.status(500).json({ error: 'Failed to save wealth snapshot' });
    }
};
