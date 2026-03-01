import { Request, Response } from 'express';
import {
    createConnectAccount,
    createOnboardingLink,
    getAccountStatus,
    createDashboardLink,
    createPaymentIntent,
    distributeFunds,
    createInstantPayout,
    getAccountBalance
} from '../services/stripeService';
import { createRazorpayOrder, verifyPaymentSignature } from '../services/razorpayService';
import { createLedgerEntry } from '../services/walletService';
import Store from '../models/Store';
import DeliveryDriver from '../models/DeliveryDriver';
import Order from '../models/Order';
import Delivery from '../models/Delivery';
import LedgerEntry from '../models/LedgerEntry';

// ─── CONNECT ONBOARDING ────────────────────────────────────

/**
 * @route   POST /api/payments/connect/onboard
 * @desc    Create Stripe Connect account for vendor or hero
 */
export const onboardConnect = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type } = req.body; // 'vendor' or 'hero'
        const userId = (req as any).user._id.toString();
        const email = (req as any).user.email;

        if (!['vendor', 'hero'].includes(type)) {
            res.status(400).json({ message: 'Type must be "vendor" or "hero"' });
            return;
        }

        // Check if already has account
        if (type === 'vendor') {
            const store = await Store.findOne({ owner: userId });
            if (store?.stripeAccountId) {
                // Already has account — generate new onboarding link if needed
                const url = await createOnboardingLink(store.stripeAccountId);
                res.json({ accountId: store.stripeAccountId, onboardingUrl: url });
                return;
            }
        }

        const { accountId, onboardingUrl } = await createConnectAccount(email, type, userId);

        // Save the account ID
        if (type === 'vendor') {
            await Store.findOneAndUpdate({ owner: userId }, { stripeAccountId: accountId });
        } else {
            await DeliveryDriver.findOneAndUpdate(
                { user: userId },
                { $set: { stripeAccountId: accountId } }
            );
        }

        res.json({ accountId, onboardingUrl });
    } catch (error) {
        console.error('Stripe onboard error:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   GET /api/payments/connect/status
 * @desc    Check Connect account status
 */
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

/**
 * @route   GET /api/payments/connect/dashboard
 * @desc    Get Stripe Express dashboard link for vendor/hero
 */
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

// ─── CUSTOMER PAYMENT ──────────────────────────────────────

/**
 * @route   POST /api/payments/create-intent
 * @desc    Create a payment intent for an order
 */
export const createOrderPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Convert to cents
        const amountInCents = Math.round(order.total * 100);

        const { clientSecret, paymentIntentId } = await createPaymentIntent(
            amountInCents,
            'usd',
            orderId,
            req.user!.email
        );

        // Store payment intent ID on order
        await Order.findByIdAndUpdate(orderId, {
            stripePaymentIntentId: paymentIntentId,
            paymentStatus: 'pending'
        });

        res.json({ clientSecret });
    } catch (error) {
        console.error('Payment intent error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ─── FUND DISTRIBUTION ─────────────────────────────────────

/**
 * @route   POST /api/payments/distribute/:orderId
 * @desc    Distribute funds after delivery is complete (3-way split)
 */
export const distributeOrderFunds = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId).populate('store');
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        if (order.status !== 'delivered') {
            res.status(400).json({ message: 'Order must be delivered before distributing funds' });
            return;
        }

        const delivery = await Delivery.findOne({ order: orderId, status: 'delivered' });
        const store = await Store.findById(order.store);

        if (!store?.stripeAccountId) {
            res.status(400).json({ message: 'Vendor has not connected their Stripe account' });
            return;
        }

        // Calculate splits (amounts in cents)
        const totalCents = Math.round(order.total * 100);
        const commissionRate = (store.commissionRate || 10) / 100;
        const vendorAmount = Math.round(totalCents * (1 - commissionRate));

        let heroAmount = 0;
        let heroAccountId = '';

        if (delivery) {
            heroAmount = Math.round((delivery.deliveryFee + delivery.tip) * 100);
            const driver = await DeliveryDriver.findOne({ user: delivery.driver });
            heroAccountId = (driver as any)?.stripeAccountId || '';
        }

        const results = await distributeFunds({
            orderId: orderId.toString(),
            totalAmount: totalCents,
            vendorAccountId: store.stripeAccountId,
            heroAccountId,
            vendorAmount,
            heroAmount
        });

        // Update order payment status
        await Order.findByIdAndUpdate(orderId, { paymentStatus: 'distributed' });

        res.json({
            message: 'Funds distributed successfully',
            splits: {
                vendor: vendorAmount / 100,
                hero: heroAmount / 100,
                platform: (totalCents - vendorAmount - heroAmount) / 100
            },
            results
        });
    } catch (error) {
        console.error('Distribution error:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

// ─── HERO INSTANT PAYOUT ───────────────────────────────────

/**
 * @route   POST /api/payments/hero/instant-payout
 * @desc    Trigger instant payout for hero
 */
export const heroInstantPayout = async (req: Request, res: Response): Promise<void> => {
    try {
        const driver = await DeliveryDriver.findOne({ user: req.user!._id });
        if (!driver) {
            res.status(404).json({ message: 'Not registered as hero' });
            return;
        }

        const accountId = (driver as any)?.stripeAccountId;
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

        res.json({
            message: 'Instant payout initiated! 💸',
            amount: balance.available / 100,
            payout
        });
    } catch (error) {
        console.error('Instant payout error:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   GET /api/payments/hero/balance
 * @desc    Get hero's Stripe balance
 */
export const getHeroBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const driver = await DeliveryDriver.findOne({ user: req.user!._id });
        const accountId = (driver as any)?.stripeAccountId;

        if (!accountId) {
            res.json({ available: 0, pending: 0, connected: false });
            return;
        }

        const balance = await getAccountBalance(accountId);
        res.json({
            available: balance.available / 100,
            pending: balance.pending / 100,
            connected: true
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ─── RAZORPAY ─────────────────────────────────────────────

/**
 * @route   POST /api/payments/razorpay/create-order
 * @desc    Create a Razorpay order for an existing app Order
 */
export const createRazorpayOrderPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        // Only own orders
        if (order.user.toString() !== (req as any).user._id.toString()) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }
        const amountInPaise = Math.round(order.total * 100);
        const rzpOrder = await createRazorpayOrder(amountInPaise, order._id!.toString());
        res.json({
            razorpayOrderId: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId,
        });
    } catch (error) {
        console.error('Razorpay create order error:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   POST /api/payments/razorpay/verify
 * @desc    Verify Razorpay payment signature and mark order as paid
 */
export const verifyRazorpayOrderPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!isValid) {
            res.status(400).json({ message: 'Invalid payment signature' });
            return;
        }

        await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'paid',
            razorpayPaymentId,
        });

        res.json({ success: true, message: 'Payment verified successfully' });
    } catch (error) {
        console.error('Razorpay verify error:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   POST /api/payments/razorpay/wallet/create-order
 * @desc    Create a Razorpay order for wallet top-up
 */
export const createRazorpayWalletTopup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { amount } = req.body; // amount in INR
        const userId = (req as any).user._id.toString();
        const amountInPaise = Math.round(amount * 100);
        const receipt = `wallet-${userId}-${Date.now()}`;
        const rzpOrder = await createRazorpayOrder(amountInPaise, receipt);
        res.json({
            razorpayOrderId: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Razorpay wallet create error:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   POST /api/payments/razorpay/wallet/verify
 * @desc    Verify wallet top-up payment and credit wallet balance
 */
export const verifyRazorpayWalletTopup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;
        const userId = (req as any).user._id.toString();

        // 1. Verify signature
        const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!isValid) {
            res.status(400).json({ message: 'Invalid payment signature' });
            return;
        }

        // 2. Idempotency — prevent double-credit if same payment verified twice
        const existing = await LedgerEntry.findOne({ razorpayPaymentId });
        if (existing) {
            res.json({ success: true, message: 'Already processed', alreadyProcessed: true });
            return;
        }

        // 3. Credit wallet via ledger
        await createLedgerEntry({
            userId,
            type: 'credit',
            amount,
            category: 'top_up',
            reference: `Razorpay wallet top-up — ${razorpayPaymentId}`,
            razorpayPaymentId,
            metadata: { razorpayOrderId },
        });

        res.json({ success: true, message: `₹${amount} added to your wallet!` });
    } catch (error) {
        console.error('Razorpay wallet verify error:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};
