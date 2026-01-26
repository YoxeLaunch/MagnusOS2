import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let auditorDb;

export const initAuditorDb = async () => {
    try {
        auditorDb = await open({
            filename: path.join(__dirname, '../data/auditor.db'),
            driver: sqlite3.Database
        });

        // Enable foreign keys
        await auditorDb.exec('PRAGMA foreign_keys = ON;');

        // Create Companies (ARS) table
        await auditorDb.exec(`
            CREATE TABLE IF NOT EXISTS companies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);

        // Create Closures table (Groups of records, e.g., "Enero 2026 - Emergencias")
        await auditorDb.exec(`
            CREATE TABLE IF NOT EXISTS closures (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('emergency', 'record')),
                status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
            );
        `);

        // Create Medical Records table
        await auditorDb.exec(`
            CREATE TABLE IF NOT EXISTS medical_records (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                closure_id TEXT,
                record_type TEXT,
                close_date TEXT NOT NULL,
                patient_name TEXT NOT NULL,
                nap TEXT NOT NULL,
                note TEXT,
                coverage REAL NOT NULL DEFAULT 0,
                glossed_amount REAL NOT NULL DEFAULT 0,
                amount_to_pay REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                FOREIGN KEY (closure_id) REFERENCES closures(id) ON DELETE CASCADE
            );
        `);

        // Migration: Add columns if they don't exist (for existing DBs)
        try {
            await auditorDb.exec(`ALTER TABLE medical_records ADD COLUMN closure_id TEXT REFERENCES closures(id) ON DELETE CASCADE;`);
        } catch (e) { /* Ignore if column exists */ }

        try {
            await auditorDb.exec(`ALTER TABLE medical_records ADD COLUMN record_type TEXT;`);
        } catch (e) { /* Ignore if column exists */ }

        // Create indexes for better performance
        await auditorDb.exec(`
            CREATE INDEX IF NOT EXISTS idx_records_company 
            ON medical_records(company_id);
        `);

        await auditorDb.exec(`
            CREATE INDEX IF NOT EXISTS idx_records_nap 
            ON medical_records(nap);
        `);

        // Seed default SENASA company if it doesn't exist
        const senasaExists = await auditorDb.get(
            'SELECT id FROM companies WHERE name = ?',
            ['SENASA']
        );

        if (!senasaExists) {
            await auditorDb.run(
                'INSERT INTO companies (id, name) VALUES (?, ?)',
                ['senasa-default', 'SENASA']
            );
            console.log('✓ Default SENASA company created');
        }

        console.log('✓ Auditor database initialized');
        return auditorDb;
    } catch (error) {
        console.error('Error initializing Auditor database:', error);
        throw error;
    }
};

export const getAuditorDb = () => {
    if (!auditorDb) {
        throw new Error('Auditor database not initialized');
    }
    return auditorDb;
};
