import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../magnus_system.db');
const db = new sqlite3.Database(dbPath);

console.log('--- Migrating Database ---');
console.log(`Open Database: ${dbPath}`);

db.serialize(() => {
    db.run("ALTER TABLE Messages ADD COLUMN replyTo TEXT;", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column "replyTo" already exists.');
            } else {
                console.error('Error adding column:', err.message);
            }
        } else {
            console.log('Column "replyTo" added successfully.');
        }
    });
});

db.close(() => {
    console.log('Database connection closed.');
});
