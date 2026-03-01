import express from 'express';
import { getPOIs, getPOIById, getPOITypes, createPOI, updatePOI, deletePOI } from '../controllers/campusPoiController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/pois', getPOIs);
router.get('/types', getPOITypes);
router.get('/pois/:id', getPOIById);

// Admin-only routes
router.post('/pois', protect, authorize('admin'), createPOI);
router.put('/pois/:id', protect, authorize('admin'), updatePOI);
router.delete('/pois/:id', protect, authorize('admin'), deletePOI);

export default router;
