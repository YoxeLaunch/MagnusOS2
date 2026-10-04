import { Router } from 'express';
import * as magnusController from '../controllers/magnusController.js';
import * as publicationController from '../controllers/publicationController.js';
import { updatePassword } from '../controllers/authController.js';
import { verifyJWT, requireSoberano, requireSelfOrAdmin } from '../middleware/auth.js';
import fs from 'fs';

const router = Router();

// Todas las rutas de usuarios/sistema requieren JWT
router.use(verifyJWT);

// Users (con control de acceso estricto)
router.get('/users', requireSoberano, magnusController.getUsers);
router.put('/users/:username/password', requireSelfOrAdmin('username'), updatePassword); // MUST be before /users/:username
router.put('/users/:username', requireSelfOrAdmin('username'), magnusController.updateUser);
router.delete('/users/:username', requireSoberano, magnusController.deleteUser);
router.put('/users/:username/preferences', requireSelfOrAdmin('username'), magnusController.updateUserPreferences);
router.post('/users/:username/tags', requireSoberano, magnusController.updateUserTags);

// Mentors
router.get('/mentors', magnusController.getMentors);
router.post('/mentors', requireSoberano, magnusController.saveMentors);

// Data (Checklist/Calendar)
router.get('/data', magnusController.getData);
router.post('/checklist', magnusController.saveChecklist);
router.post('/calendar', magnusController.saveCalendar);

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// Multer Config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../public/images/mentors'));
    },
    filename: (req, file, cb) => {
        // Sanitize: "Jose De La Cruz.jpg" -> "jose-de-la-cruz-TIMESTAMP.jpg"
        const name = file.originalname.toLowerCase().replace(/[^a-z0-9.]/g, '-');
        cb(null, `upload-${Date.now()}-${name}`);
    }
});
const upload = multer({ storage });

router.get('/curriculum', magnusController.getCurriculum);
router.post('/curriculum/toggle', magnusController.toggleMission);
router.post('/curriculum/mission', magnusController.createMission);
router.put('/curriculum/mission', magnusController.updateMission);
router.delete('/curriculum/mission', magnusController.deleteMission);
router.post('/upload', upload.single('image'), magnusController.uploadImage);

// ========================================
// Publicaciones (Blog de Mentoría)
// Lectura para todos los usuarios autenticados; escritura solo soberano/admin
// ========================================
const publicationStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdirSync(publicationController.UPLOADS_DIR, { recursive: true });
        cb(null, publicationController.UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const name = file.originalname.toLowerCase().replace(/[^a-z0-9.]/g, '-');
        cb(null, `pub-${Date.now()}-${name}`);
    }
});
const publicationUpload = multer({
    storage: publicationStorage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP, GIF) y PDF'));
    }
});

router.get('/publications', publicationController.getPublications);
router.post('/publications', requireSoberano, publicationController.createPublication);
router.put('/publications/:id', requireSoberano, publicationController.updatePublication);
router.delete('/publications/:id', requireSoberano, publicationController.deletePublication);
router.post('/publications/upload', requireSoberano, publicationUpload.single('file'), publicationController.uploadPublicationFile);

export default router;
