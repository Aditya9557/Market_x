import express from 'express';
import {
    registerAsHero,
    toggleOnline,
    getHeroStatus,
    getEarnings,
    getAvailableOrders,
    acceptDelivery,
    updateDeliveryStatus,
    verifyDeliveryOtp,
    adminOtpOverride,
    getActiveDelivery,
    updateLocation,
    trackDelivery,
} from '../controllers/heroController';
import { getHeroEconomicsHandler } from '../controllers/heroEconomicsController';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    validate,
    registerHeroSchema,
    acceptDeliverySchema,
    updateDeliveryStatusSchema,
    updateLocationSchema,
    verifyOtpSchema,
} from '../middleware/validation';
import { heroAcceptLimiter } from '../middleware/rateLimiter';

const router = express.Router();
router.use(protect);

// Registration & status
router.post('/register', validate(registerHeroSchema), registerAsHero);
router.get('/status', getHeroStatus);

// Online/offline toggle
router.post('/toggle', toggleOnline);

// Earnings
router.get('/earnings', getEarnings);
router.get('/economics', getHeroEconomicsHandler);

// Available orders & accept
router.get('/available-orders', getAvailableOrders);
router.post('/accept/:orderId', heroAcceptLimiter, validate(acceptDeliverySchema), acceptDelivery);

// Active delivery management
router.get('/active-delivery', getActiveDelivery);
router.put('/delivery/:id/status', validate(updateDeliveryStatusSchema), updateDeliveryStatus);

// Phase-1: OTP verification by hero
router.post('/delivery/:id/verify-otp', validate(verifyOtpSchema), verifyDeliveryOtp);

// Location update (HTTP fallback — primary via Socket.io)
router.post('/location', validate(updateLocationSchema), updateLocation);

// Customer tracking endpoint
router.get('/track/:deliveryId', trackDelivery);

// Admin: OTP override (admin only)
router.post('/admin/order/:orderId/otp-override', authorize('admin'), adminOtpOverride);

export default router;
