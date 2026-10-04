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
import healthRoutes from './routes/health.routes.js';
import { initSystemDb } from './models/system/index.js';
import { securityHeaders, apiLimiter } from './middleware/security.js';
import { scheduleCurrencyRateJob, fetchAndStoreRates } from './jobs/currencyRateJob.js';
import { scheduleFxJob } from './jobs/fxSchedulerJob.js';
import { scheduleMacroJob } from './jobs/macroSchedulerJob.js';
import { scheduleEnergyJob } from './jobs/energySchedulerJob.js';
import { eventEngine } from './services/macro/eventEngine.js';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const server = http.createServer(app);

// Static files paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 1. Security Headers first (protects both static assets and API routes)
app.use(securityHeaders);

// 2. CORS
app.use(cors(corsOptions));

// 3. Static files
app.use(express.static(path.join(__dirname, '../dist'))); // Serve public folder
app.use(express.static(path.join(__dirname, '../public')));

const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'])
            : '*',
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Rate limiting & JSON parser
app.use(apiLimiter);
app.use(express.json({ limit: '1mb' })); // Rutas de importación usan su propio límite extendido

// Health Check Probes (Liveness & Readiness public, Deep protected)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

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

        // Auto-actualización diaria de tasas de cambio (USD/EUR -> DOP)
        scheduleCurrencyRateJob();
        fetchAndStoreRates(); // Refresco inicial al arrancar el servidor

        // Planificador inteligente de mercado cambiario dominicano (Providence FX)
        scheduleFxJob();

        // Planificador de Contexto Macroeconómico Dominicano (Macro RD)
        scheduleMacroJob();

        // Planificador de Combustibles y Mercado Energético (Energía RD)
        scheduleEnergyJob();

        // Initialize Socket
        initSocket(io);
        initDockerSocket(io);
        eventEngine.setSocket(io);


    } catch (error) {
        console.error('CRITICAL INIT ERROR:', error);
        process.exit(1);
    }
};

startServer();
