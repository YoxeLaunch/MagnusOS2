import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to root server directory (../)
const SERVER_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(SERVER_ROOT, 'data');

const DB_PATH = path.join(DATA_DIR, 'finanza.db');
const SYSTEM_DB_PATH = path.join(DATA_DIR, 'magnus_system.db');

// ========================================
// Database Configuration
// ========================================
// Priority: DATABASE_URL (PostgreSQL) > SQLite fallback

const createSequelizeInstance = (dbPath, name) => {
    // Check for PostgreSQL connection string
    if (process.env.DATABASE_URL) {
        console.log(`>>> [${name}] Using PostgreSQL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
        return new Sequelize(process.env.DATABASE_URL, {
            dialect: 'postgres',
            logging: process.env.NODE_ENV === 'development' ? console.log : false,
            dialectOptions: {
                ssl: process.env.DATABASE_SSL === 'true' ? {
                    require: true,
                    rejectUnauthorized: false
                } : false
            },
            pool: {
                max: 10,   // Conexiones máximas simultáneas
                min: 2,    // Mantener mínimo 2 conexiones listas (evita latencia cold-start)
                acquire: 30000,
                idle: 10000
            }
        });
    }

    // Fallback to SQLite for local development
    console.log(`>>> [${name}] Using SQLite: ${dbPath}`);
    return new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false
    });
};

// ========================================
// Main Database (finanza, users, transactions)
// ========================================
export const sequelize = createSequelizeInstance(DB_PATH, 'MAIN DB');

// ========================================
// System Database (magnus, mentors, curriculum)
// ========================================
// For PostgreSQL, we use schemas instead of separate files
// For SQLite, we keep separate files for compatibility
export const sequelizeSystem = process.env.DATABASE_URL
    ? sequelize  // Share connection in PostgreSQL (use schemas if needed)
    : createSequelizeInstance(SYSTEM_DB_PATH, 'SYSTEM DB');

// ========================================
// JSON DB Paths (for legacy compatibility)
// ========================================
export const JSON_DB_PATHS = {
    DB: path.join(DATA_DIR, 'db.json'),
    MENTORS: path.join(DATA_DIR, 'mentors.json'),
    UPDATES: path.join(DATA_DIR, 'updates.json'),
    CHAT: path.join(DATA_DIR, 'chat.json'),
    PRIVATE_CHAT: path.join(DATA_DIR, 'private_chats.json')
};

// ========================================
// Database Info (for debugging)
// ========================================
export const getDatabaseInfo = () => ({
    type: process.env.DATABASE_URL ? 'postgresql' : 'sqlite',
    isProduction: process.env.NODE_ENV === 'production',
    dataDir: DATA_DIR
});

console.log('>>> [DB CONFIG] DATA_DIR:', DATA_DIR);
console.log('>>> [DB CONFIG] Database Type:', getDatabaseInfo().type);
