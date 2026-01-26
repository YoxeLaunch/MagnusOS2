
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../magnus_system.db');

console.log(`Attempting to delete: ${dbPath}`);

try {
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('SUCCESS: maven_system.db deleted.');
    } else {
        console.log('INFO: File did not exist.');
    }
} catch (error) {
    console.error('ERROR: Could not delete DB file. Is it open?', error);
    // If we can't delete, we try to truncate properly using Sequelize in the next step,
    // but usually this means a process lock.
}
