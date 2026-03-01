import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getUserProfile,
    updateLocation,
    getWallet,
    contactSupport,
    deleteAccount,
    getTerms,
    getPrivacy
} from '../controllers/userController';

const router = express.Router();

// Private routes (require auth)
router.get('/profile', protect, getUserProfile);
router.put('/location', protect, updateLocation);
router.get('/wallet', protect, getWallet);
router.post('/contact', protect, contactSupport);
router.delete('/delete', protect, deleteAccount);

// Public routes
router.get('/terms', getTerms);
router.get('/privacy', getPrivacy);

export default router;
