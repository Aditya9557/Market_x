import express from 'express';
import {
    submitHeroApplication,
    getMyApplication,
    updateOnboarding,
} from '../controllers/heroApplicationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Student submits hero application
router.post('/apply', submitHeroApplication);

// Get my latest application status
router.get('/status', getMyApplication);

// Update onboarding checklist (after approval)
router.put('/onboarding', updateOnboarding);

export default router;
