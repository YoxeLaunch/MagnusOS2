import express from 'express';
import {
    getCompanies,
    createCompany,
    getRecordsByCompany,
    createRecord,
    deleteRecord,
    getCompanyStats,
    getClosures,
    createClosure,
    updateRecord
} from '../controllers/auditor.controller.js';

const router = express.Router();

// Companies (ARS) routes
router.get('/companies', getCompanies);
router.post('/companies', createCompany);

// Closures routes
router.get('/closures', getClosures);
router.post('/closures', createClosure);

// Medical Records routes
router.get('/companies/:companyId/records', getRecordsByCompany);
router.post('/records', createRecord);
router.put('/records/:id', updateRecord);
router.delete('/records/:id', deleteRecord);

// Statistics
router.get('/companies/:companyId/stats', getCompanyStats);

export default router;
