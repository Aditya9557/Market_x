import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generalLimiter } from './middleware/rateLimiter';
import { createRouter, handleStripeWebhook } from './routes';

// ── Express App Setup ──────────────────────────────
const app = express();

// Security headers
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
}));

// General rate limiter
app.use(generalLimiter);

// ⚠️ Stripe webhook MUST use raw body — mount BEFORE JSON parser
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// CORS and JSON parsing
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Mount all API routes
app.use('/api', createRouter());

// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        service: 'Market-X API',
        version: '2.0.0',
        platform: 'Firebase Cloud Functions',
        timestamp: new Date().toISOString(),
    });
});

// ── Export Cloud Function ───────────────────────────
export const api = onRequest(app);

// ── Scheduled Functions ─────────────────────────────

export const dailyReconciliation = onSchedule('0 2 * * *', async () => {
    const { db } = await import('./config/firebase');
    console.log('Starting daily reconciliation...');

    try {
        const usersSnap = await db.collection('users').get();
        let inconsistencies = 0;

        for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();
            const walletBalance = userData.walletBalance || 0;

            const ledgerSnap = await db.collection('ledgerEntries')
                .where('user', '==', userDoc.id)
                .get();

            let totalCredits = 0;
            let totalDebits = 0;
            ledgerSnap.docs.forEach(d => {
                const entry = d.data();
                if (entry.type === 'credit') totalCredits += entry.amount;
                else totalDebits += entry.amount;
            });

            const ledgerBalance = totalCredits - totalDebits;
            const isConsistent = Math.abs(walletBalance - ledgerBalance) < 0.01;

            if (!isConsistent) {
                inconsistencies++;
                console.warn(`Mismatch: user ${userDoc.id} wallet=${walletBalance} ledger=${ledgerBalance}`);
            }
        }

        await db.collection('reconciliationReports').doc().set({
            runAt: new Date(),
            totalUsers: usersSnap.size,
            inconsistencies,
            status: inconsistencies === 0 ? 'clean' : 'has_mismatches',
        });

        console.log(`Reconciliation complete: ${usersSnap.size} users, ${inconsistencies} mismatches`);
    } catch (error) {
        console.error('Reconciliation error:', error);
    }
});

// ── Firestore Triggers ──────────────────────────────

export const onDeliveryStatusChange = onDocumentUpdated(
    'deliveries/{deliveryId}',
    async (event) => {
        const before = event.data?.before?.data();
        const after = event.data?.after?.data();

        if (!before || !after || before.status === after.status) return;

        const { db } = await import('./config/firebase');
        try {
            const deliveryId = event.params.deliveryId;
            const trackingRef = db.collection('deliveryTracking').doc(deliveryId);
            const trackingDoc = await trackingRef.get();
            if (trackingDoc.exists) {
                await trackingRef.update({
                    status: after.status,
                    updatedAt: new Date(),
                });
            }
        } catch (error) {
            console.error('Failed to sync delivery tracking:', error);
        }
    }
);

export const onNewOrder = onDocumentCreated(
    'orders/{orderId}',
    async (event) => {
        const order = event.data?.data();
        if (!order || order.type !== 'child' || order.orderType !== 'delivery') return;
        console.log(`New delivery order created: ${event.params.orderId} — available for hero assignment`);
    }
);
