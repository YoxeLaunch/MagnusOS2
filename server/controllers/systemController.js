import os from 'os';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import zlib from 'zlib';
import { SystemUpdate, AppSettings } from '../models/system/index.js';

// ... imports ...

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SYSTEM STATS ---
export const getSystemStats = (req, res) => {
    // ... same code ...
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const processMem = process.memoryUsage();

        // Calculate DB Size
        const dbPath = path.join(__dirname, '..', 'finanza.db');
        let dbSize = 0;
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            dbSize = (stats.size / 1024 / 1024).toFixed(2); // MB
        }

        const stats = {
            uptime: process.uptime(),
            dbSize: dbSize,
            system: {
                totalMemory: totalMem,
                freeMemory: freeMem,
                usedMemory: usedMem,
                memoryUsagePercentage: ((usedMem / totalMem) * 100).toFixed(2)
            },
            process: {
                rss: processMem.rss,
                heapTotal: processMem.heapTotal,
                heapUsed: processMem.heapUsed,
                external: processMem.external
            },
            loadAverage: os.loadavg(),
            cpus: os.cpus().length,
            platform: os.platform(),
            release: os.release()
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching system stats' });
    }
};

// --- UPDATES ---
export const getUpdates = async (req, res) => {
    try {
        const updates = await SystemUpdate.findAll({
            order: [['date', 'DESC']],
            where: { isPublished: true }
        });
        res.json(updates);
    } catch (error) {
        console.error('Error fetching updates:', error);
        res.status(500).json({ error: 'Error fetching updates' });
    }
};

export const createUpdate = async (req, res) => {
    try {
        const { title, description, type, date, isPublished } = req.body;

        const newUpdate = await SystemUpdate.create({
            title,
            description,
            type: type || 'feature',
            date: date || new Date(),
            isPublished: isPublished !== undefined ? isPublished : true
        });

        res.json(newUpdate);
    } catch (error) {
        console.error('Error creating update:', error);
        res.status(500).json({ error: 'Failed to create update' });
    }
};

// --- UPLOAD CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Resolve path relative to server root -> ../public/mentors
        const uploadPath = path.join(__dirname, '../../public/mentors');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const cleanName = path.parse(file.originalname).name;
        const firstName = cleanName.split(/[\s\-_]+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now().toString().slice(-4);
        cb(null, `${firstName}-${uniqueSuffix}${ext}`);
    }
});

export const upload = multer({ storage: storage });

export const handleUpload = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const publicPath = `/mentors/${req.file.filename}`;
        res.json({ url: publicPath });
    } catch (error) {
        res.status(500).json({ error: 'Error uploading file' });
    }
};

// --- SYSTEM BROADCAST ---
export const sendBroadcast = (req, res) => {
    try {
        const { title, message, type } = req.body;

        if (!req.io) {
            throw new Error('Socket.IO not initialized in request');
        }

        req.io.emit('system:broadcast', {
            title,
            message,
            type: type || 'info',
            timestamp: new Date()
        });

        console.log(`[BROADCAST] Sent: ${title}`);
        res.json({ success: true, message: 'Broadcast sent to all clients' });
    } catch (error) {
        console.error('[BROADCAST] Error:', error);
        res.status(500).json({ error: 'Failed to send broadcast' });
    }
};

// --- BACKUP ---
// Respalda la base de datos Postgres directamente vía red (pg_dump | gzip), sin
// depender del socket de Docker. Comparte carpeta con scripts/backup.sh (cron del host)
// mediante el volumen /home/osvaldo/backups/magnus-os2 -> /app/server/data/backups.
const BACKUP_DIR = path.join(__dirname, '../data/backups');
const SAFE_BACKUP_NAME = /^magnus_[\w-]+\.sql\.gz$/;
let isBackingUp = false;

const ensureBackupDir = () => {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
};

export const backupDatabase = (req, res) => {
    if (isBackingUp) {
        return res.status(409).json({ error: 'Ya hay un proceso de backup en curso.' });
    }

    ensureBackupDir();

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        return res.status(500).json({ error: 'DATABASE_URL no configurada' });
    }

    isBackingUp = true;

    // Mismo formato que scripts/backup.sh (date +%Y-%m-%d_%H-%M-%S) para listar ambos orígenes de forma consistente.
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    const filename = `magnus_${timestamp}.sql.gz`;
    const destPath = path.join(BACKUP_DIR, filename);

    const dump = spawn('pg_dump', [databaseUrl]);
    const out = fs.createWriteStream(destPath);
    let stderr = '';
    let responded = false;
    let exitCode = null;
    let fileFinished = false;

    dump.stderr.on('data', chunk => { stderr += chunk.toString(); });

    const fail = (message, details) => {
        isBackingUp = false;
        if (responded) return;
        responded = true;
        fs.unlink(destPath, () => {});
        console.error('[BACKUP]', message, details || '');
        res.status(500).json({ error: message, details });
    };

    const finalize = () => {
        if (responded || exitCode === null || !fileFinished) return;
        if (exitCode !== 0) {
            return fail('Backup falló', stderr);
        }
        const stats = fs.statSync(destPath);
        if (stats.size === 0) {
            return fail('El archivo de backup generado está vacío');
        }
        isBackingUp = false;
        responded = true;
        res.json({
            success: true,
            message: 'Backup creado correctamente',
            backup: { name: filename, size: stats.size, createdAt: stats.mtime }
        });
    };

    dump.on('error', err => fail('pg_dump no disponible en el contenedor', err.message));
    dump.on('close', code => { exitCode = code; finalize(); });

    dump.stdout.pipe(zlib.createGzip()).pipe(out);
    out.on('finish', () => { fileFinished = true; finalize(); });
    out.on('error', err => fail('Error escribiendo el archivo de backup', err.message));
};

export const listBackups = (req, res) => {
    try {
        ensureBackupDir();
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.sql.gz'))
            .map(f => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return { name: f, size: stats.size, createdAt: stats.mtime };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ backups });
    } catch (error) {
        console.error('[BACKUP] Error listando:', error);
        res.status(500).json({ error: 'Error listando backups' });
    }
};

export const downloadBackup = (req, res) => {
    const { filename } = req.params;
    if (!SAFE_BACKUP_NAME.test(filename)) {
        return res.status(400).json({ error: 'Nombre de archivo inválido' });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Backup no encontrado' });
    }
    res.download(filePath, filename);
};

export const deleteBackup = (req, res) => {
    const { filename } = req.params;
    if (!SAFE_BACKUP_NAME.test(filename)) {
        return res.status(400).json({ error: 'Nombre de archivo inválido' });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Backup no encontrado' });
    }
    try {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Backup eliminado correctamente' });
    } catch (error) {
        console.error('[BACKUP] Error eliminando:', error);
        res.status(500).json({ error: 'Error eliminando el archivo de backup' });
    }
};

// --- SETTINGS: BANNERS ---
export const getBanners = async (req, res) => {
    try {
        const banner1 = await AppSettings.findByPk('welcome_banner_1');
        const banner2 = await AppSettings.findByPk('welcome_banner_2');

        res.json({
            banner1: banner1?.value || '',
            banner2: banner2?.value || ''
        });
    } catch (error) {
        console.error('[SETTINGS] Error fetching banners:', error);
        res.status(500).json({ error: 'Error fetching banners' });
    }
};

export const saveBanners = async (req, res) => {
    try {
        const { banner1, banner2 } = req.body;

        // Upsert banner1
        if (banner1 !== undefined) {
            await AppSettings.upsert({
                key: 'welcome_banner_1',
                value: banner1
            });
        }

        // Upsert banner2
        if (banner2 !== undefined) {
            await AppSettings.upsert({
                key: 'welcome_banner_2',
                value: banner2
            });
        }

        res.json({
            success: true,
            message: 'Banners saved successfully'
        });
    } catch (error) {
        console.error('[SETTINGS] Error saving banners:', error);
        res.status(500).json({ error: 'Error saving banners' });
    }
};

