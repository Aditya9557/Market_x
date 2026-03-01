import express from 'express';
import { protect, authorize, storeScope } from '../middleware/authMiddleware';
import { loginLimiter, signupLimiter, heroAcceptLimiter, paymentLimiter } from '../middleware/rateLimiter';
import {
    validate, signupSchema, loginSchema, createOrderSchema,
    updateOrderStatusSchema, registerHeroSchema, acceptDeliverySchema,
    updateDeliveryStatusSchema, updateLocationSchema, verifyOtpSchema,
    adminOtpOverrideSchema, createDisputeSchema, resolveDisputeSchema,
    rateHeroSchema, onboardConnectSchema, createPaymentIntentSchema,
    razorpayCreateOrderSchema, razorpayVerifySchema,
    razorpayWalletTopupSchema, razorpayWalletVerifySchema,
    productSchema, storeUpdateSchema, heroApplicationSchema,
} from '../middleware/validation';

// Controllers
import { signup, login, logout } from '../controllers/authController';
import { healthCheck } from '../controllers/healthController';
import {
    getUserProfile, updateLocation as updateUserLocation,
    getWallet, contactSupport, deleteAccount,
    getTerms, getPrivacy, getUserLedger,
} from '../controllers/userController';
import {
    getPendingShops, getAllStores, approveShop,
    rejectShop, toggleUniGuideApproval,
} from '../controllers/adminController';
import { getStores, getStoreById, getMyStore, updateMyStore } from '../controllers/storeController';
import {
    getProducts, getProductById, createProduct,
    updateProduct, deleteProduct,
} from '../controllers/productController';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/cartController';
import {
    createOrder, getMyOrders, getOrderById,
    getVendorOrders, updateOrderStatus, getAllOrders,
} from '../controllers/orderController';
import {
    registerAsHero, toggleOnline, getHeroStatus, getEarnings,
    getAvailableOrders, acceptDelivery, updateDeliveryStatus,
    verifyDeliveryOtp, updateLocation as updateHeroLocation, trackDelivery,
    adminOtpOverride, getActiveDelivery,
} from '../controllers/heroController';
import {
    onboardConnect, getConnectStatus, getDashboardLink,
    createOrderPayment, distributeOrderFunds, heroInstantPayout,
    getHeroBalance, createRazorpayOrderPayment, verifyRazorpayOrderPayment,
    createRazorpayWalletTopup, verifyRazorpayWalletTopup, handleStripeWebhook,
} from '../controllers/paymentController';
import {
    fileDispute, getMyDisputes, getDisputes, resolveDispute,
} from '../controllers/disputeController';

export const createRouter = (): express.Router => {
    const router = express.Router();

    // ── HEALTH ──────────────────────────────────────
    router.get('/health', healthCheck);

    // ── AUTH ─────────────────────────────────────────
    router.post('/auth/signup', signupLimiter, validate(signupSchema), signup);
    router.post('/auth/login', loginLimiter, validate(loginSchema), login);
    router.post('/auth/logout', protect, logout);

    // ── USER ─────────────────────────────────────────
    router.get('/user/profile', protect, getUserProfile);
    router.put('/user/location', protect, updateUserLocation);
    router.get('/user/wallet', protect, getWallet);
    router.get('/user/ledger', protect, getUserLedger);
    router.post('/user/contact', protect, contactSupport);
    router.delete('/user/delete', protect, deleteAccount);
    router.get('/user/terms', getTerms);
    router.get('/user/privacy', getPrivacy);

    // ── ADMIN ────────────────────────────────────────
    router.get('/admin/pending-shops', protect, authorize('admin'), getPendingShops);
    router.get('/admin/all-stores', protect, authorize('admin'), getAllStores);
    router.put('/admin/approve-shop/:id', protect, authorize('admin'), approveShop);
    router.put('/admin/reject-shop/:id', protect, authorize('admin'), rejectShop);
    router.put('/admin/uniguide-toggle/:storeId', protect, authorize('admin'), toggleUniGuideApproval);
    router.get('/admin/orders', protect, authorize('admin'), getAllOrders);
    router.get('/admin/disputes', protect, authorize('admin'), getDisputes);
    router.put('/admin/disputes/:id/resolve', protect, authorize('admin'), validate(resolveDisputeSchema), resolveDispute);

    // ── STORES (public) ──────────────────────────────
    router.get('/stores', getStores);
    router.get('/stores/:id', getStoreById);

    // ── PRODUCTS (public) ────────────────────────────
    router.get('/products', getProducts);
    router.get('/products/:id', getProductById);

    // ── CART (student) ───────────────────────────────
    router.get('/cart', protect, authorize('student'), getCart);
    router.post('/cart/add', protect, authorize('student'), addToCart);
    router.put('/cart/update', protect, authorize('student'), updateCartItem);
    router.delete('/cart/remove/:productId', protect, authorize('student'), removeFromCart);
    router.delete('/cart/clear', protect, authorize('student'), clearCart);

    // ── ORDERS (student) ─────────────────────────────
    router.post('/orders', protect, authorize('student'), validate(createOrderSchema), createOrder);
    router.get('/orders/my', protect, authorize('student'), getMyOrders);
    router.get('/orders/:id', protect, getOrderById);

    // ── VENDOR ───────────────────────────────────────
    router.get('/vendor/store', protect, authorize('shopkeeper'), storeScope(false), getMyStore);
    router.put('/vendor/store', protect, authorize('shopkeeper'), storeScope(false), validate(storeUpdateSchema), updateMyStore);
    router.get('/vendor/orders', protect, authorize('shopkeeper'), storeScope(true), getVendorOrders);
    router.put('/vendor/orders/:id/status', protect, authorize('shopkeeper'), storeScope(true), validate(updateOrderStatusSchema), updateOrderStatus);
    router.post('/vendor/products', protect, authorize('shopkeeper'), storeScope(true), validate(productSchema), createProduct);
    router.put('/vendor/products/:id', protect, authorize('shopkeeper'), storeScope(true), updateProduct);
    router.delete('/vendor/products/:id', protect, authorize('shopkeeper'), storeScope(true), deleteProduct);

    // ── HERO ─────────────────────────────────────────
    router.post('/hero/register', protect, validate(registerHeroSchema), registerAsHero);
    router.get('/hero/status', protect, getHeroStatus);
    router.post('/hero/toggle', protect, toggleOnline);
    router.get('/hero/earnings', protect, getEarnings);
    router.get('/hero/available-orders', protect, getAvailableOrders);
    router.post('/hero/accept/:orderId', protect, heroAcceptLimiter, validate(acceptDeliverySchema), acceptDelivery);
    router.get('/hero/active-delivery', protect, getActiveDelivery);
    router.put('/hero/delivery/:id/status', protect, validate(updateDeliveryStatusSchema), updateDeliveryStatus);
    router.post('/hero/delivery/:id/verify-otp', protect, validate(verifyOtpSchema), verifyDeliveryOtp);
    router.post('/hero/location', protect, validate(updateLocationSchema), updateHeroLocation);
    router.get('/hero/track/:deliveryId', protect, trackDelivery);
    router.post('/hero/admin/order/:orderId/otp-override', protect, authorize('admin'), validate(adminOtpOverrideSchema), adminOtpOverride);

    // ── PAYMENTS ─────────────────────────────────────
    router.post('/payments/connect/onboard', protect, paymentLimiter, validate(onboardConnectSchema), onboardConnect);
    router.get('/payments/connect/status', protect, getConnectStatus);
    router.get('/payments/connect/dashboard', protect, getDashboardLink);
    router.post('/payments/create-intent', protect, paymentLimiter, validate(createPaymentIntentSchema), createOrderPayment);
    router.post('/payments/distribute/:orderId', protect, authorize('admin'), distributeOrderFunds);
    router.post('/payments/hero/instant-payout', protect, paymentLimiter, heroInstantPayout);
    router.get('/payments/hero/balance', protect, getHeroBalance);
    router.post('/payments/razorpay/create-order', protect, paymentLimiter, validate(razorpayCreateOrderSchema), createRazorpayOrderPayment);
    router.post('/payments/razorpay/verify', protect, validate(razorpayVerifySchema), verifyRazorpayOrderPayment);
    router.post('/payments/razorpay/wallet/create-order', protect, paymentLimiter, validate(razorpayWalletTopupSchema), createRazorpayWalletTopup);
    router.post('/payments/razorpay/wallet/verify', protect, validate(razorpayWalletVerifySchema), verifyRazorpayWalletTopup);

    // Stripe webhook (raw body — handled separately in index.ts)
    // router.post('/payments/webhook', handleStripeWebhook);

    // ── DISPUTES ─────────────────────────────────────
    router.post('/disputes', protect, validate(createDisputeSchema), fileDispute);
    router.get('/disputes/my', protect, getMyDisputes);

    return router;
};

export { handleStripeWebhook };
