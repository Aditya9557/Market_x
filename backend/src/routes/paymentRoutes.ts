import express from 'express';
import {
    onboardConnect,
    getConnectStatus,
    getDashboardLink,
    createOrderPayment,
    distributeOrderFunds,
    heroInstantPayout,
    getHeroBalance,
    createRazorpayOrderPayment,
    verifyRazorpayOrderPayment,
    createRazorpayWalletTopup,
    verifyRazorpayWalletTopup,
} from '../controllers/paymentController';
import { handleStripeWebhook } from '../controllers/webhookController';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    validate,
    createPaymentIntentSchema,
    onboardConnectSchema,
    razorpayCreateOrderSchema,
    razorpayVerifySchema,
    razorpayWalletTopupSchema,
    razorpayWalletVerifySchema,
} from '../middleware/validation';
import { paymentLimiter, webhookLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// ⚠️ Webhook MUST be before any body-parsing middleware
// It needs the raw body for signature verification.
// The raw body middleware is applied in server.ts for this route.
router.post('/webhook', webhookLimiter, handleStripeWebhook);

// All other payment routes require auth
router.use(protect);

// Stripe Connect onboarding (vendors & heroes)
router.post('/connect/onboard', validate(onboardConnectSchema), onboardConnect);
router.get('/connect/status', getConnectStatus);
router.get('/connect/dashboard', getDashboardLink);

// Customer payment
router.post('/create-intent', paymentLimiter, authorize('student'), validate(createPaymentIntentSchema), createOrderPayment);

// Admin: distribute funds after delivery
router.post('/distribute/:orderId', authorize('admin'), distributeOrderFunds);

// Hero: instant payout & balance
router.post('/hero/instant-payout', paymentLimiter, heroInstantPayout);
router.get('/hero/balance', getHeroBalance);

// ─── Razorpay ───
// Order payments
router.post('/razorpay/create-order', paymentLimiter, authorize('student'), validate(razorpayCreateOrderSchema), createRazorpayOrderPayment);
router.post('/razorpay/verify', paymentLimiter, authorize('student'), validate(razorpayVerifySchema), verifyRazorpayOrderPayment);
// Wallet top-up
router.post('/razorpay/wallet/create-order', paymentLimiter, authorize('student'), validate(razorpayWalletTopupSchema), createRazorpayWalletTopup);
router.post('/razorpay/wallet/verify', paymentLimiter, authorize('student'), validate(razorpayWalletVerifySchema), verifyRazorpayWalletTopup);

export default router;
