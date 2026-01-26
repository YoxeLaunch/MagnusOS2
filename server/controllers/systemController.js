import os from 'os';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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
export const backupDatabase = (req, res) => {
    try {
        const backupDir = path.join(__dirname, '../../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dbs = ['finanza.db', 'magnus_system.db'];
        const results = [];

        dbs.forEach(dbName => {
            const dbPath = path.join(__dirname, '..', dbName);
            if (fs.existsSync(dbPath)) {
                const destPath = path.join(backupDir, `${dbName.replace('.db', '')}-${timestamp}.db`);
                fs.copyFileSync(dbPath, destPath);
                results.push({
                    original: dbName,
                    backup: path.basename(destPath)
                });
            }
        });

        res.json({
            success: true,
            message: `Created ${results.length} backups`,
            backups: results
        });
    } catch (error) {
        console.error('[BACKUP] Error:', error);
        res.status(500).json({ error: 'Backup failed internal server error' });
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

