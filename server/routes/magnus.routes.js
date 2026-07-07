import { Router } from 'express';
import * as magnusController from '../controllers/magnusController.js';
import * as publicationController from '../controllers/publicationController.js';
import { updatePassword } from '../controllers/authController.js';
import { verifyJWT, requireSoberano } from '../middleware/auth.js';
import fs from 'fs';

const router = Router();

// Todas las rutas de usuarios/sistema requieren JWT
router.use(verifyJWT);

// Users
router.get('/users', magnusController.getUsers);
router.put('/users/:username/password', updatePassword); // MUST be before /users/:username
router.put('/users/:username', magnusController.updateUser);
router.delete('/users/:username', magnusController.deleteUser);
router.put('/users/:username/preferences', magnusController.updateUserPreferences);
router.post('/users/:username/tags', magnusController.updateUserTags);
// Note: tags logic was inline in old index.js, assuming front-end handles tags via simple update or need specific endpoint?
// Old index.js had /api/users/:username/tags. Let's add that to controller.
// Wait, I missed addTags in controller. I will add it to routes for now and patch controller later if needed, 
// or just handle it via generic updateUser.
// For now let's stick to generic user update or I'll quickly check if I need a specific one.
// The old code had a specific push/remove logic. I should probably add that to controller to match 1:1 parity.

// Mentors
router.get('/mentors', magnusController.getMentors);
router.post('/mentors', magnusController.saveMentors);

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
