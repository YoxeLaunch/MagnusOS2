import { Account, toMinorUnits, fromMinorUnits } from '../models/index.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import { Op } from 'sequelize';

// ========================================
// GET /api/finanza/accounts
// List all accounts for a user
// ========================================
export const getAccounts = async (req, res) => {
    try {
        const { includeArchived } = req.query;
        const effectiveUserId = getEffectiveUserId(req, req.query.userId);

        const where = { userId: effectiveUserId };
        if (includeArchived !== 'true') {
            where.isArchived = false;
        }

        const accounts = await Account.findAll({
            where,
            order: [['sortOrder', 'ASC'], ['name', 'ASC']]
        });

        // Convert minor units to display amounts
        const formatted = accounts.map(acc => ({
            ...acc.toJSON(),
            openingBalance: fromMinorUnits(acc.openingBalanceMinor),
            currentBalance: fromMinorUnits(acc.currentBalanceMinor)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('[Accounts] Error fetching accounts:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// POST /api/finanza/accounts
// Create a new account
// ========================================
export const createAccount = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.body.userId);
        const {
            name,
            type,
            currency = 'DOP',
            institution,
            openingBalance = 0,
            notes
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                error: 'name and type are required'
            });
        }

        const validTypes = ['cash', 'checking', 'savings', 'credit_card', 'investment', 'loan'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: `type must be one of: ${validTypes.join(', ')}`
            });
        }

        // Get max sort order for user
        const maxOrder = await Account.max('sortOrder', { where: { userId: effectiveUserId } }) || 0;

        const account = await Account.create({
            userId: effectiveUserId,
            name: name.trim(),
            type,
            currency,
            institution,
            openingBalanceMinor: toMinorUnits(openingBalance),
            currentBalanceMinor: toMinorUnits(openingBalance), // Initial balance = opening
            notes,
            sortOrder: maxOrder + 1
        });

        res.status(201).json({
            ...account.toJSON(),
            openingBalance: fromMinorUnits(account.openingBalanceMinor),
            currentBalance: fromMinorUnits(account.currentBalanceMinor)
        });
    } catch (error) {
        console.error('[Accounts] Error creating account:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// PATCH /api/finanza/accounts/:id
// Update an account
// ========================================
export const updateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) {
            where.userId = req.user.username;
        }

        const account = await Account.findOne({ where });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Convert opening balance if provided
        if (updates.openingBalance !== undefined) {
            updates.openingBalanceMinor = toMinorUnits(updates.openingBalance);
            delete updates.openingBalance;
        }

        // Don't allow direct update of currentBalanceMinor or userId
        delete updates.currentBalanceMinor;
        delete updates.currentBalance;
        delete updates.userId;
        delete updates.id;

        await account.update(updates);

        res.json({
            ...account.toJSON(),
            openingBalance: fromMinorUnits(account.openingBalanceMinor),
            currentBalance: fromMinorUnits(account.currentBalanceMinor)
        });
    } catch (error) {
        console.error('[Accounts] Error updating account:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// DELETE /api/finanza/accounts/:id
// Archive an account (soft delete)
// ========================================
export const archiveAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) {
            where.userId = req.user.username;
        }

        const account = await Account.findOne({ where });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        await account.update({ isArchived: true });

        res.json({ success: true, message: 'Account archived' });
    } catch (error) {
        console.error('[Accounts] Error archiving account:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// GET /api/finanza/accounts/:id/balance
// Get calculated balance for an account
// ========================================
export const getAccountBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const { asOf } = req.query; // Optional date filter
        const isAdmin = req.user.role === 'admin' || req.user.username?.toLowerCase() === 'soberano';

        const where = { id };
        if (!isAdmin) {
            where.userId = req.user.username;
        }

        const account = await Account.findOne({ where });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json({
            accountId: id,
            accountName: account.name,
            openingBalance: fromMinorUnits(account.openingBalanceMinor),
            currentBalance: fromMinorUnits(account.currentBalanceMinor),
            currency: account.currency,
            asOf: asOf || new Date().toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('[Accounts] Error getting balance:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// POST /api/finanza/accounts/reorder
// Update sort order for accounts
// ========================================
export const reorderAccounts = async (req, res) => {
    try {
        const effectiveUserId = getEffectiveUserId(req, req.body.userId);
        const { order } = req.body; // order = [{id, sortOrder}, ...]

        if (!Array.isArray(order)) {
            return res.status(400).json({ error: 'order array is required' });
        }

        // Update each account's sort order belonging to the user
        await Promise.all(
            order.map(({ id, sortOrder }) =>
                Account.update({ sortOrder }, { where: { id, userId: effectiveUserId } })
            )
        );

        res.json({ success: true });
    } catch (error) {
        console.error('[Accounts] Error reordering:', error);
        res.status(500).json({ error: error.message });
    }
};

