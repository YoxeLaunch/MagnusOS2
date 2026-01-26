import { LedgerTransaction, TransactionLine, Account, Category, Payee, toMinorUnits, sequelize } from '../models/index.js';
import crypto from 'crypto';
import { Op } from 'sequelize';

// ========================================
// CSV IMPORT CONTROLLER
// Supports: Bank exports, OFX-like formats
// ========================================

/**
 * Generate a hash for deduplication
 * Uses date + amount + description to identify unique transactions
 */
const generateTransactionHash = (date, amount, description, accountId) => {
    const raw = `${date}|${amount}|${(description || '').toLowerCase().trim()}|${accountId}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
};

/**
 * Parse amount from various formats
 * - "1,234.56" → 1234.56
 * - "(500.00)" → -500.00 (credit card style)
 * - "-500.00" → -500.00
 */
const parseAmount = (value) => {
    if (!value || value === '') return 0;
    const str = String(value).trim();

    // Handle parentheses as negative (accounting style)
    if (str.startsWith('(') && str.endsWith(')')) {
        return -parseAmount(str.slice(1, -1));
    }

    // Remove currency symbols and thousand separators
    const cleaned = str
        .replace(/[$€RD\s]/g, '')
        .replace(/,(?=\d{3})/g, ''); // Remove thousand separators

    return parseFloat(cleaned) || 0;
};

/**
 * Parse date from various formats
 * - "2026-01-15"
 * - "15/01/2026"
 * - "01/15/2026"
 * - "Jan 15, 2026"
 */
const parseDate = (value) => {
    if (!value) return null;
    const str = String(value).trim();

    // ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.substring(0, 10);
    }

    // DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const [, a, b, year] = slashMatch;
        // Assume DD/MM/YYYY for Latin America
        const day = parseInt(a) > 12 ? a : b;
        const month = parseInt(a) > 12 ? b : a;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try native Date parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    return null;
};

/**
 * Detect CSV columns from headers
 */
const detectColumns = (headers) => {
    const normalized = headers.map(h => h.toLowerCase().trim());

    const patterns = {
        date: ['date', 'fecha', 'transaction date', 'posted date', 'fecha transaccion'],
        description: ['description', 'descripcion', 'memo', 'details', 'concepto', 'detalle'],
        amount: ['amount', 'monto', 'importe', 'valor'],
        debit: ['debit', 'debito', 'cargo', 'withdrawal'],
        credit: ['credit', 'credito', 'abono', 'deposit'],
        balance: ['balance', 'saldo'],
        reference: ['reference', 'referencia', 'ref', 'check', 'cheque']
    };

    const result = {};
    for (const [field, keywords] of Object.entries(patterns)) {
        const idx = normalized.findIndex(h => keywords.some(k => h.includes(k)));
        if (idx !== -1) result[field] = idx;
    }

    return result;
};

/**
 * Parse CSV content
 */
const parseCSV = (content, delimiter = ',') => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must have at least header and one data row');

    // Parse headers
    const headers = lines[0].split(delimiter).map(h => h.replace(/^"|"$/g, '').trim());

    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.replace(/^"|"$/g, '').trim());
        if (values.length >= headers.length - 1) { // Allow some flexibility
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
            });
            rows.push(row);
        }
    }

    return { headers, rows };
};

// ========================================
// POST /api/finanza/import/preview
// Preview CSV before importing
// ========================================
export const previewImport = async (req, res) => {
    try {
        const { content, accountId, delimiter = ',' } = req.body;

        if (!content || !accountId) {
            return res.status(400).json({ error: 'content and accountId are required' });
        }

        // Verify account exists
        const account = await Account.findByPk(accountId);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Parse CSV
        const { headers, rows } = parseCSV(content, delimiter);
        const columns = detectColumns(headers);

        // Transform rows to preview format
        const preview = rows.slice(0, 20).map(row => {
            let amount = 0;

            // Handle single amount column or debit/credit split
            if (columns.amount !== undefined) {
                amount = parseAmount(row[headers[columns.amount]]);
            } else if (columns.debit !== undefined || columns.credit !== undefined) {
                const debit = columns.debit !== undefined ? parseAmount(row[headers[columns.debit]]) : 0;
                const credit = columns.credit !== undefined ? parseAmount(row[headers[columns.credit]]) : 0;
                amount = credit - debit; // Credits are income, debits are expenses
            }

            const date = columns.date !== undefined ? parseDate(row[headers[columns.date]]) : null;
            const description = columns.description !== undefined ? row[headers[columns.description]] : '';
            const reference = columns.reference !== undefined ? row[headers[columns.reference]] : '';

            return {
                date,
                description,
                amount,
                reference,
                hash: date ? generateTransactionHash(date, amount, description, accountId) : null,
                raw: row
            };
        });

        res.json({
            headers,
            detectedColumns: columns,
            preview,
            totalRows: rows.length,
            accountName: account.name
        });
    } catch (error) {
        console.error('[Import] Error previewing:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// POST /api/finanza/import
// Import transactions from CSV
// ========================================
export const importTransactions = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const {
            content,
            accountId,
            userId,
            delimiter = ',',
            columnMapping,  // Optional override of detected columns
            invertAmounts = false,  // For credit card statements where debits are positive
            skipDuplicates = true
        } = req.body;

        if (!content || !accountId || !userId) {
            await t.rollback();
            return res.status(400).json({ error: 'content, accountId, and userId are required' });
        }

        // Verify account
        const account = await Account.findByPk(accountId, { transaction: t });
        if (!account) {
            await t.rollback();
            return res.status(404).json({ error: 'Account not found' });
        }

        // Parse CSV
        const { headers, rows } = parseCSV(content, delimiter);
        const columns = columnMapping || detectColumns(headers);

        // Get existing hashes for deduplication
        const existingHashes = new Set();
        if (skipDuplicates) {
            const existing = await LedgerTransaction.findAll({
                where: { userId },
                attributes: ['reference'],
                raw: true,
                transaction: t
            });
            existing.forEach(tx => {
                if (tx.reference?.startsWith('import:')) {
                    existingHashes.add(tx.reference.substring(7));
                }
            });
        }

        // Process rows
        const results = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Parse amount
                let amount = 0;
                if (columns.amount !== undefined) {
                    amount = parseAmount(row[headers[columns.amount]]);
                } else if (columns.debit !== undefined || columns.credit !== undefined) {
                    const debit = columns.debit !== undefined ? parseAmount(row[headers[columns.debit]]) : 0;
                    const credit = columns.credit !== undefined ? parseAmount(row[headers[columns.credit]]) : 0;
                    amount = credit - debit;
                }

                if (invertAmounts) amount = -amount;
                if (amount === 0) continue; // Skip zero-amount rows

                // Parse other fields
                const date = columns.date !== undefined ? parseDate(row[headers[columns.date]]) : null;
                if (!date) {
                    results.errors.push({ row: i + 2, error: 'Invalid date' });
                    continue;
                }

                const description = columns.description !== undefined ? row[headers[columns.description]] : '';
                const reference = columns.reference !== undefined ? row[headers[columns.reference]] : '';

                // Generate hash for deduplication
                const hash = generateTransactionHash(date, amount, description, accountId);

                if (skipDuplicates && existingHashes.has(hash)) {
                    results.skipped++;
                    continue;
                }

                // Determine transaction type
                const type = amount > 0 ? 'income' : 'expense';

                // Create transaction
                const txn = await LedgerTransaction.create({
                    userId,
                    date,
                    payeeName: description.substring(0, 255),
                    memo: description.length > 255 ? description : null,
                    status: 'pending',
                    type,
                    reference: `import:${hash}`
                }, { transaction: t });

                // Create transaction line
                await TransactionLine.create({
                    transactionId: txn.id,
                    accountId,
                    amountMinor: toMinorUnits(amount),
                    currency: account.currency
                }, { transaction: t });

                // Create balancing line to "Income" or "Expense" category (placeholder)
                // In a real double-entry system, this would go to an expense/income account
                await TransactionLine.create({
                    transactionId: txn.id,
                    accountId, // Same account for now (will be categorized later)
                    amountMinor: toMinorUnits(-amount), // Opposite sign
                    currency: account.currency,
                    memo: 'Pending categorization'
                }, { transaction: t });

                // Update account balance
                await account.update({
                    currentBalanceMinor: account.currentBalanceMinor + toMinorUnits(amount)
                }, { transaction: t });

                existingHashes.add(hash);
                results.imported++;

            } catch (rowError) {
                results.errors.push({ row: i + 2, error: rowError.message });
            }
        }

        await t.commit();

        res.json({
            success: true,
            imported: results.imported,
            skipped: results.skipped,
            errors: results.errors.slice(0, 10), // Limit error output
            totalErrors: results.errors.length
        });

    } catch (error) {
        await t.rollback();
        console.error('[Import] Error importing:', error);
        res.status(500).json({ error: error.message });
    }
};

// ========================================
// GET /api/finanza/import/templates
// Get supported import templates/formats
// ========================================
export const getImportTemplates = async (req, res) => {
    const templates = [
        {
            id: 'generic',
            name: 'CSV Genérico',
            description: 'Formato estándar con columnas Date, Description, Amount',
            requiredColumns: ['date', 'description', 'amount'],
            example: 'Date,Description,Amount\n2026-01-15,Supermercado,-1500.00'
        },
        {
            id: 'bank_debit_credit',
            name: 'Estado de Cuenta Bancario',
            description: 'Formato con columnas separadas de Débito y Crédito',
            requiredColumns: ['date', 'description', 'debit', 'credit'],
            example: 'Fecha,Concepto,Debito,Credito\n15/01/2026,Deposito,,5000.00'
        },
        {
            id: 'credit_card',
            name: 'Tarjeta de Crédito',
            description: 'Formato de extracto de tarjeta (montos positivos = gastos)',
            requiredColumns: ['date', 'description', 'amount'],
            settings: { invertAmounts: true }
        }
    ];

    res.json(templates);
};

// ========================================
// POST /api/finanza/import/categorize
// Apply categorization rules to uncategorized imports
// ========================================
export const categorizeImports = async (req, res) => {
    const { userId, rules } = req.body;

    if (!userId || !Array.isArray(rules)) {
        return res.status(400).json({ error: 'userId and rules array are required' });
    }

    // Rules format: [{ pattern: "netflix", categoryId: "uuid" }, ...]
    try {
        // Find uncategorized transaction lines
        const uncategorized = await TransactionLine.findAll({
            where: { categoryId: null },
            include: [{
                model: LedgerTransaction,
                as: 'transaction',
                where: { userId },
                attributes: ['id', 'payeeName', 'memo']
            }]
        });

        let categorized = 0;

        for (const line of uncategorized) {
            const text = `${line.transaction?.payeeName || ''} ${line.transaction?.memo || ''}`.toLowerCase();

            for (const rule of rules) {
                if (text.includes(rule.pattern.toLowerCase())) {
                    await line.update({ categoryId: rule.categoryId });
                    categorized++;
                    break;
                }
            }
        }

        res.json({ categorized, total: uncategorized.length });
    } catch (error) {
        console.error('[Import] Error categorizing:', error);
        res.status(500).json({ error: error.message });
    }
};
