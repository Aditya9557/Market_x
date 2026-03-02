import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';
import { connectRedis } from './config/redis';
import logger, { requestIdMiddleware, globalErrorHandler } from './config/logger';
import { generalLimiter } from './middleware/rateLimiter';

// Route imports
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import storeRoutes, { vendorStoreRouter } from './routes/storeRoutes';
import productRoutes, { vendorProductRouter } from './routes/productRoutes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes, { vendorOrderRouter, adminOrderRouter } from './routes/orderRoutes';
import heroRoutes from './routes/heroRoutes';
import heroApplicationRoutes from './routes/heroApplicationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import userRoutes from './routes/userRoutes';
import campusPoiRoutes from './routes/campusPoiRoutes';
import uniGuideRoutes from './routes/uniGuideRoutes';
import disputeRoutes from './routes/disputeRoutes';
import healthRoutes from './routes/healthRoutes';
import { initSocket } from './socket/socketServer';
import { getSupabase } from './services/supabaseService';
import { startReconciliationCron } from './services/reconciliationService';
import growthRoutes from './routes/growthRoutes';
import { startBusinessAnalyticsCron } from './scripts/businessAnalyticsWorker';
import helmet from 'helmet';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time delivery tracking
const io = initSocket(server);

// ─── MIDDLEWARE ─────────────────────────────────────────────

// Request ID for log correlation
app.use(requestIdMiddleware);

// Helmet — HTTP security headers
app.use(helmet({
    crossOriginEmbedderPolicy: false,    // needed for Supabase storage URLs
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
}));

// General rate limiter
app.use(generalLimiter);

// ⚠️ Stripe webhook route MUST use raw body (before express.json())
// We mount it here before the JSON parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// JSON parser for all other routes
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── ROUTES ─────────────────────────────────────────────────

// Health check (no auth)
app.use('/api/health', healthRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// User profile/wallet routes
app.use('/api/user', userRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/orders', adminOrderRouter);

// Public routes
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);

// Student routes
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Vendor routes
app.use('/api/vendor/store', vendorStoreRouter);
app.use('/api/vendor/products', vendorProductRouter);
app.use('/api/vendor/orders', vendorOrderRouter);

// Hero (delivery driver) routes
app.use('/api/hero', heroRoutes);

// Hero application routes (become a hero)
app.use('/api/hero-application', heroApplicationRoutes);

// Payment routes (Stripe Connect + webhook)
app.use('/api/payments', paymentRoutes);

// Campus Guide routes (POI locations)
app.use('/api/campus', campusPoiRoutes);

// Uni Guide mode routes (shop filtering, hero tasks)
app.use('/api/uniguide', uniGuideRoutes);

// Dispute routes
app.use('/api/disputes', disputeRoutes);

// Growth engine routes (founder dashboard, campaigns, referrals, pricing, ops, investor)
app.use('/api', growthRoutes);

// ─── ERROR HANDLING ─────────────────────────────────────────

app.use(globalErrorHandler);

// ─── STARTUP ────────────────────────────────────────────────

// Initialize Supabase (dual-database: MongoDB + Supabase for real-time)
getSupabase();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    await connectRedis();

    server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        logger.info(`Socket.io WebSocket server ready`);
        logger.info(`Health check: /api/health`);
        logger.info(`Routes: /api/auth, /api/admin, /api/stores, /api/products, /api/cart, /api/orders, /api/vendor/*, /api/hero, /api/payments, /api/campus, /api/disputes`);

        // Start background crons
        if (process.env.NODE_ENV !== 'test') {
            startReconciliationCron();
            logger.info('Reconciliation cron registered (runs daily at 02:00 UTC)');
            startBusinessAnalyticsCron();
            logger.info('Business analytics cron registered (01:00 UTC snapshot, 09:00 UTC retention)');
        }
    });
};

startServer();
