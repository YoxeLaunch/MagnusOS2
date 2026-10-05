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

const assertSafeDatabaseUrl = (url, isTest = false) => {
    if (!url) return true;
    try {
        const parsed = new URL(url);
        const dbName = parsed.pathname.replace(/^\//, '');
        const user = parsed.username;
        const port = parsed.port || '5432';
        const host = parsed.hostname;

        if (isTest) {
            // In test mode: strictly require test database, test user, and test endpoint
            if (dbName !== 'magnus_test') {
                throw new Error(`[TEST GUARDRAIL] Aborting: Test database must strictly be 'magnus_test' (found '${dbName}')`);
            }
            if (user === 'magnus' || user === 'magnus_app') {
                throw new Error(`[TEST GUARDRAIL] Aborting: Test database cannot use production user '${user}'`);
            }
            if (host === 'postgres' || (host === 'localhost' && port === '5432') || (host === '127.0.0.1' && port === '5432')) {
                throw new Error(`[TEST GUARDRAIL] Aborting: Test database cannot use production PostgreSQL endpoint (${host}:${port})`);
            }
        }
        return true;
    } catch (err) {
        if (err.message.includes('[TEST GUARDRAIL]')) throw err;
        throw new Error(`[TEST GUARDRAIL] Invalid database URL: ${err.message}`);
    }
};

const createSequelizeInstance = (dbPath, name) => {
    // TEST GUARDRAIL: Strict protection against running tests on production DB
    if (process.env.NODE_ENV === 'test') {
        if (process.env.DATABASE_URL_TEST) {
            assertSafeDatabaseUrl(process.env.DATABASE_URL_TEST, true);
        } else if (process.env.DATABASE_URL) {
            // Production DATABASE_URL present in env but no test URL: do NOT connect to postgres in tests
            // Fall through to SQLite :memory: for safety
            assertSafeDatabaseUrl(process.env.DATABASE_URL, true);
        }
    }

    // Check for PostgreSQL connection string
    // In test mode, only connect to PostgreSQL if DATABASE_URL_TEST is explicitly provided
    const dbUrl = process.env.NODE_ENV === 'test'
        ? process.env.DATABASE_URL_TEST
        : process.env.DATABASE_URL;

    if (dbUrl) {
        if (process.env.NODE_ENV === 'test') {
            assertSafeDatabaseUrl(dbUrl, true);
        }
        console.log(`>>> [${name}] Using PostgreSQL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);
        return new Sequelize(dbUrl, {
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

    // Fallback to SQLite
    const sqlitePath = process.env.NODE_ENV === 'test' ? ':memory:' : dbPath;
    console.log(`>>> [${name}] Using SQLite: ${sqlitePath}`);
    return new Sequelize({
        dialect: 'sqlite',
        storage: sqlitePath,
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
export const getDatabaseInfo = () => {
    const isTest = process.env.NODE_ENV === 'test';
    const activeUrl = isTest ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;
    return {
        type: activeUrl ? 'postgresql' : 'sqlite',
        isProduction: process.env.NODE_ENV === 'production',
        dataDir: DATA_DIR
    };
};

console.log('>>> [DB CONFIG] DATA_DIR:', DATA_DIR);
console.log('>>> [DB CONFIG] Database Type:', getDatabaseInfo().type);
