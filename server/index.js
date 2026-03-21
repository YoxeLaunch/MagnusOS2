import express from 'express';
import cors from 'cors';
import http from 'http';
import os from 'os';
import { Server } from 'socket.io';
import { initDb } from './models/index.js';
import { initAuditorDb } from './models/auditor.js';
import { initSocket } from './socket/chatHandler.js';
import { initDockerSocket } from './socket/dockerSocket.js';
import routes from './routes/index.js';
import { initSystemDb } from './models/system/index.js';
import { securityHeaders, apiLimiter } from './middleware/security.js';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const server = http.createServer(app);

// Static files (Images fallback)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../dist'))); // Serve public folder

const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'])
            : '*',
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 4001;

// CORS Configuration - Usa variable de entorno en producción
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:4000', 'http://localhost:4001'];

const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ALLOWED_ORIGINS
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(apiLimiter);
app.use(express.json({ limit: '1mb' })); // Rutas de importación usan su propio límite extendido

// Health Check Endpoint para Docker
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Logger & Socket Injection
app.use((req, res, next) => {
    req.io = io;
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api', routes);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});



// Initialize Database & Start Server
console.log('--- Initializing Backend ---');
console.log('--- Initializing Backend ---');

const startServer = async () => {
    try {
        console.log('>>> [OPTIMIZED] Starting Critical DB Init...');
        // Parallelize critical database initialization
        await Promise.all([initDb(), initSystemDb(), initAuditorDb()]);

        // Start Server immediately after DBs are ready
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`\n>>> SistemaM Server Modular v2.0 (Optimized w/ Node.js) Running on http://0.0.0.0:${PORT}`);

            // Print Network Interfaces
            const interfaces = os.networkInterfaces();
            console.log('\n--- Direcciones de Acceso ---');
            console.log(`[mDNS]: http://Manus.local:${PORT}`);
            Object.keys(interfaces).forEach((ifname) => {
                interfaces[ifname].forEach((iface) => {
                    if ('IPv4' !== iface.family || iface.internal !== false) return;
                    console.log(`[${ifname}]: http://${iface.address}:${PORT}`);
                });
            });
            console.log('-----------------------------\n');
        });

        // Initialize Socket
        initSocket(io);
        initDockerSocket(io);


    } catch (error) {
        console.error('CRITICAL INIT ERROR:', error);
        process.exit(1);
    }
};

startServer();
