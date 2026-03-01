import express from 'express';
import { getUniGuideShops, getUniGuideZones, getHeroTasks, requestHero, getUniGuidePOIs } from '../controllers/uniGuideController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/shops', getUniGuideShops);
router.get('/zones', getUniGuideZones);
router.get('/pois', getUniGuidePOIs);

// Authenticated routes
router.get('/hero-tasks', protect, getHeroTasks);
router.post('/request-hero', protect, requestHero);

export default router;
