import { Request, Response } from 'express';
import { db } from '../config/firebase';
import {
    createConnectAccount, createOnboardingLink, getAccountStatus,
    createDashboardLink, createPaymentIntent, distributeFunds,
    createInstantPayout, getAccountBalance,
} from '../services/stripeService';
import { createRazorpayOrder, verifyPaymentSignature } from '../services/razorpayService';
import { createLedgerEntry } from '../services/walletService';

// ── CONNECT ONBOARDING ──────────────────────────────

export const onboardConnect = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type } = req.body;
        const userId = req.user!.uid;
        const email = req.user!.email;

        if (!['vendor', 'hero'].includes(type)) {
            res.status(400).json({ message: 'Type must be "vendor" or "hero"' });
            return;
        }

        if (type === 'vendor') {
            const storesSnap = await db.collection('stores').where('owner', '==', userId).limit(1).get();
            if (!storesSnap.empty) {
                const store = storesSnap.docs[0];
                const stripeId = store.data().stripeAccountId;
                if (stripeId) {
                    const url = await createOnboardingLink(stripeId);
                    res.json({ accountId: stripeId, onboardingUrl: url });
                    return;
                }
            }
        }

        const { accountId, onboardingUrl } = await createConnectAccount(email, type, userId);

        if (type === 'vendor') {
            const storesSnap = await db.collection('stores').where('owner', '==', userId).limit(1).get();
            if (!storesSnap.empty) {
                await db.collection('stores').doc(storesSnap.docs[0].id).update({ stripeAccountId: accountId });
            }
        } else {
            await db.collection('deliveryDrivers').doc(userId).update({ stripeAccountId: accountId });
        }

        res.json({ accountId, onboardingUrl });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

export const getConnectStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { accountId } = req.query;
        if (!accountId || typeof accountId !== 'string') {
            res.status(400).json({ message: 'accountId query param required' });
            return;
        }
        const status = await getAccountStatus(accountId);
        res.json(status);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getDashboardLink = async (req: Request, res: Response): Promise<void> => {
    try {
        const { accountId } = req.query;
        if (!accountId || typeof accountId !== 'string') {
            res.status(400).json({ message: 'accountId query param required' });
            return;
        }
        const url = await createDashboardLink(accountId);
        res.json({ url });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── CUSTOMER PAYMENT ────────────────────────────────

export const createOrderPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.body;
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        const order = orderDoc.data()!;
        const amountInCents = Math.round(order.total * 100);

        const { clientSecret, paymentIntentId } = await createPaymentIntent(
            amountInCents, 'usd', orderId, req.user!.email
        );

        await db.collection('orders').doc(orderId).update({
            stripePaymentIntentId: paymentIntentId,
            paymentStatus: 'pending',
            updatedAt: new Date(),
        });

        res.json({ clientSecret });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── FUND DISTRIBUTION ───────────────────────────────

export const distributeOrderFunds = async (req: Request, res: Response): Promise<void> => {
    try {
        const orderId = req.params.orderId as string;
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        const order = orderDoc.data()!;
        if (order.status !== 'delivered') {
            res.status(400).json({ message: 'Order must be delivered before distributing funds' });
            return;
        }

        // Get delivery
        const deliverySnap = await db.collection('deliveries')
            .where('order', '==', orderId)
            .where('status', '==', 'delivered')
            .limit(1)
            .get();

        // Get store
        let storeStripeId = '';
        let commissionRate = 10;
        if (order.store) {
            const storeDoc = await db.collection('stores').doc(order.store).get();
            if (storeDoc.exists) {
                storeStripeId = storeDoc.data()!.stripeAccountId || '';
                commissionRate = storeDoc.data()!.commissionRate || 10;
            }
        }

        if (!storeStripeId) {
            res.status(400).json({ message: 'Vendor has not connected their Stripe account' });
            return;
        }

        const totalCents = Math.round(order.total * 100);
        const vendorAmount = Math.round(totalCents * (1 - commissionRate / 100));

        let heroAmount = 0;
        let heroAccountId = '';
        if (!deliverySnap.empty) {
            const del = deliverySnap.docs[0].data();
            heroAmount = Math.round(((del.deliveryFee || 0) + (del.tip || 0)) * 100);
            if (del.driver) {
                const driverDoc = await db.collection('deliveryDrivers').doc(del.driver).get();
                if (driverDoc.exists) heroAccountId = driverDoc.data()!.stripeAccountId || '';
            }
        }

        const results = await distributeFunds({
            orderId, totalAmount: totalCents,
            vendorAccountId: storeStripeId, heroAccountId,
            vendorAmount, heroAmount,
        });

        await db.collection('orders').doc(orderId).update({ paymentStatus: 'distributed', updatedAt: new Date() });

        res.json({
            message: 'Funds distributed successfully',
            splits: { vendor: vendorAmount / 100, hero: heroAmount / 100, platform: (totalCents - vendorAmount - heroAmount) / 100 },
            results,
        });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

// ── HERO PAYOUTS ────────────────────────────────────

export const heroInstantPayout = async (req: Request, res: Response): Promise<void> => {
    try {
        const heroId = req.user!.uid;
        const driverDoc = await db.collection('deliveryDrivers').doc(heroId).get();
        if (!driverDoc.exists) {
            res.status(404).json({ message: 'Not registered as hero' });
            return;
        }
        const accountId = driverDoc.data()!.stripeAccountId;
        if (!accountId) {
            res.status(400).json({ message: 'Connect your Stripe account first' });
            return;
        }
        const balance = await getAccountBalance(accountId);
        if (balance.available <= 0) {
            res.status(400).json({ message: 'No available balance to cash out' });
            return;
        }
        const payout = await createInstantPayout(accountId, balance.available);
        res.json({ message: 'Instant payout initiated! 💸', amount: balance.available / 100, payout });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

export const getHeroBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const heroId = req.user!.uid;
        const driverDoc = await db.collection('deliveryDrivers').doc(heroId).get();
        const accountId = driverDoc.exists ? driverDoc.data()!.stripeAccountId : null;
        if (!accountId) {
            res.json({ available: 0, pending: 0, connected: false });
            return;
        }
        const balance = await getAccountBalance(accountId);
        res.json({ available: balance.available / 100, pending: balance.pending / 100, connected: true });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── RAZORPAY ────────────────────────────────────────

export const createRazorpayOrderPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.body;
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) { res.status(404).json({ message: 'Order not found' }); return; }
        const order = orderDoc.data()!;
        if (order.user !== req.user!.uid) { res.status(403).json({ message: 'Not authorized' }); return; }

        const amountInPaise = Math.round(order.total * 100);
        const rzpOrder = await createRazorpayOrder(amountInPaise, orderId);
        res.json({ razorpayOrderId: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, keyId: process.env.RAZORPAY_KEY_ID, orderId });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

export const verifyRazorpayOrderPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
            res.status(400).json({ message: 'Invalid payment signature' });
            return;
        }
        await db.collection('orders').doc(orderId).update({ paymentStatus: 'paid', razorpayPaymentId, updatedAt: new Date() });
        res.json({ success: true, message: 'Payment verified successfully' });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

export const createRazorpayWalletTopup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { amount } = req.body;
        const amountInPaise = Math.round(amount * 100);
        const receipt = `wallet-${req.user!.uid}-${Date.now()}`;
        const rzpOrder = await createRazorpayOrder(amountInPaise, receipt);
        res.json({ razorpayOrderId: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

export const verifyRazorpayWalletTopup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;
        if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
            res.status(400).json({ message: 'Invalid payment signature' });
            return;
        }

        // Idempotency check
        const existingSnap = await db.collection('ledgerEntries')
            .where('razorpayPaymentId', '==', razorpayPaymentId)
            .limit(1)
            .get();
        if (!existingSnap.empty) {
            res.json({ success: true, message: 'Already processed', alreadyProcessed: true });
            return;
        }

        await createLedgerEntry({
            userId: req.user!.uid, type: 'credit', amount,
            category: 'top_up',
            reference: `Razorpay wallet top-up — ${razorpayPaymentId}`,
            razorpayPaymentId, metadata: { razorpayOrderId },
        });

        res.json({ success: true, message: `₹${amount} added to your wallet!` });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

// ── WEBHOOK ─────────────────────────────────────────

export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) { res.status(400).json({ message: 'Missing stripe-signature header' }); return; }

    try {
        const { verifyWebhookSignature } = await import('../services/stripeService');
        const event = verifyWebhookSignature(req.body, signature);

        // Idempotency check
        const existingSnap = await db.collection('webhookEvents')
            .where('eventId', '==', (event as any).id)
            .limit(1)
            .get();

        if (!existingSnap.empty) {
            res.status(200).json({ received: true, duplicate: true });
            return;
        }

        // Store webhook event
        await db.collection('webhookEvents').doc().set({
            eventId: (event as any).id,
            type: (event as any).type,
            data: JSON.parse(JSON.stringify((event as any).data)),
            processed: true,
            createdAt: new Date(),
        });

        res.status(200).json({ received: true });
    } catch (err: any) {
        res.status(400).json({ message: `Webhook error: ${err.message}` });
    }
};
