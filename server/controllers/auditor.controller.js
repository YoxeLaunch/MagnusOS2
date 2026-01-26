import { getAuditorDb } from '../models/auditor.js';
import { randomBytes } from 'crypto';

const generateId = () => randomBytes(6).toString('hex');

// ========== COMPANIES (ARS) ==========
export const getCompanies = async (req, res) => {
    try {
        const db = getAuditorDb();
        const companies = await db.all(
            'SELECT * FROM companies ORDER BY name ASC'
        );
        res.json(companies);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Error al obtener compañías' });
    }
};

export const createCompany = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nombre de compañía requerido' });
        }

        const db = getAuditorDb();
        const id = generateId();

        await db.run(
            'INSERT INTO companies (id, name) VALUES (?, ?)',
            [id, name.toUpperCase().trim()]
        );

        const newCompany = await db.get('SELECT * FROM companies WHERE id = ?', [id]);
        res.status(201).json(newCompany);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Esta compañía ya existe' });
        }
        console.error('Error creating company:', error);
        res.status(500).json({ error: 'Error al crear compañía' });
    }
};

// ========== CLOSURES (CIERRES) ==========
export const getClosures = async (req, res) => {
    try {
        const { companyId, type } = req.query;
        const db = getAuditorDb();

        // Filter query
        let query = 'SELECT * FROM closures WHERE company_id = ?';
        const params = [companyId];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC';

        const closures = await db.all(query, params);
        res.json(closures);
    } catch (error) {
        console.error('Error fetching closures:', error);
        res.status(500).json({ error: 'Error al obtener cierres' });
    }
};

export const createClosure = async (req, res) => {
    try {
        const { company_id, name, type } = req.body;

        if (!company_id || !name || !type) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const db = getAuditorDb();
        const id = generateId();

        await db.run(
            'INSERT INTO closures (id, company_id, name, type) VALUES (?, ?, ?, ?)',
            [id, company_id, name, type]
        );

        const newClosure = await db.get('SELECT * FROM closures WHERE id = ?', [id]);
        res.status(201).json(newClosure);
    } catch (error) {
        console.error('Error creating closure:', error);
        res.status(500).json({ error: 'Error al crear cierre' });
    }
};

// ========== MEDICAL RECORDS ==========
// ========== MEDICAL RECORDS ==========
export const getRecordsByCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { closureId } = req.query; // Filter by closure
        const db = getAuditorDb();

        let query = 'SELECT * FROM medical_records WHERE company_id = ?';
        const params = [companyId];

        if (closureId) {
            query += ' AND closure_id = ?';
            params.push(closureId);
        }

        query += ' ORDER BY created_at DESC';

        const records = await db.all(query, params);

        res.json(records);
    } catch (error) {
        console.error('Error fetching records:', error);
        res.status(500).json({ error: 'Error al obtener expedientes' });
    }
};

export const createRecord = async (req, res) => {
    try {
        const {
            company_id,
            closure_id,
            record_type,
            close_date,
            patient_name,
            nap,
            note,
            coverage,
            glossed_amount,
            amount_to_pay
        } = req.body;

        // Validation
        if (!company_id || !patient_name || !nap || coverage === undefined) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const db = getAuditorDb();
        const id = generateId();

        await db.run(
            `INSERT INTO medical_records 
            (id, company_id, closure_id, record_type, close_date, patient_name, nap, note, coverage, glossed_amount, amount_to_pay) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                company_id,
                closure_id,
                record_type,
                close_date,
                patient_name.toUpperCase(),
                nap,
                note ? note.toUpperCase() : null,
                coverage,
                glossed_amount || 0,
                amount_to_pay || (coverage - (glossed_amount || 0))
            ]
        );

        const newRecord = await db.get('SELECT * FROM medical_records WHERE id = ?', [id]);
        res.status(201).json(newRecord);
    } catch (error) {
        console.error('Error creating record:', error);
        res.status(500).json({ error: 'Error al crear expediente' });
    }
};

export const updateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            close_date,
            patient_name,
            nap,
            note,
            coverage,
            glossed_amount,
            amount_to_pay
        } = req.body;

        const db = getAuditorDb();

        // Check if exists
        const existing = await db.get('SELECT * FROM medical_records WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Expediente no encontrado' });
        }

        await db.run(
            `UPDATE medical_records SET
            close_date = ?,
            patient_name = ?,
            nap = ?,
            note = ?,
            coverage = ?,
            glossed_amount = ?,
            amount_to_pay = ?
            WHERE id = ?`,
            [
                close_date || existing.close_date,
                patient_name ? patient_name.toUpperCase() : existing.patient_name,
                nap || existing.nap,
                note !== undefined ? (note ? note.toUpperCase() : null) : existing.note,
                coverage !== undefined ? coverage : existing.coverage,
                glossed_amount !== undefined ? glossed_amount : existing.glossed_amount,
                amount_to_pay !== undefined ? amount_to_pay : existing.amount_to_pay,
                id
            ]
        );

        const updatedRecord = await db.get('SELECT * FROM medical_records WHERE id = ?', [id]);
        res.json(updatedRecord);
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ error: 'Error al actualizar expediente' });
    }
};

export const deleteRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getAuditorDb();

        const result = await db.run('DELETE FROM medical_records WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Expediente no encontrado' });
        }

        res.json({ message: 'Expediente eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).json({ error: 'Error al eliminar expediente' });
    }
};

// ========== STATISTICS ==========
export const getCompanyStats = async (req, res) => {
    try {
        const { companyId } = req.params;
        const db = getAuditorDb();

        const stats = await db.get(`
            SELECT 
                COUNT(*) as count,
                SUM(coverage) as total_coverage,
                SUM(glossed_amount) as total_glossed,
                SUM(amount_to_pay) as total_to_pay
            FROM medical_records 
            WHERE company_id = ?
        `, [companyId]);

        // Calculate approval rate (records with no glossed amount)
        const noGlossed = await db.get(`
            SELECT COUNT(*) as count 
            FROM medical_records 
            WHERE company_id = ? AND glossed_amount = 0
        `, [companyId]);

        const approvalRate = stats.count > 0
            ? ((noGlossed.count / stats.count) * 100).toFixed(1)
            : 100;

        res.json({
            count: stats.count || 0,
            approvalRate,
            totalCoverage: stats.total_coverage || 0,
            totalGlossed: stats.total_glossed || 0,
            totalToPay: stats.total_to_pay || 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};
