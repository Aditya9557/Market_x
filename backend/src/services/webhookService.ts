import mongoose from 'mongoose';
import stripe from './stripeService';
import Order from '../models/Order';
import WebhookEvent from '../models/WebhookEvent';
import { createLedgerEntry } from './walletService';
import { isProcessed, markProcessed } from '../config/redis';
import logger from '../config/logger';

/**
 * Webhook Service — handles Stripe webhook events with idempotency.
 * 
 * Idempotency is dual-layered:
 * 1. Redis: fast check (SETNX webhook:event:{id}) — prevents concurrent processing
 * 2. MongoDB: persistent check (WebhookEvent collection) — prevents reprocessing after Redis eviction
 */

export const processWebhookEvent = async (event: any): Promise<{ processed: boolean; action?: string }> => {
    const eventId = event.id;
    const eventType = event.type;

    // Layer 1: Redis idempotency check
    const redisKey = `webhook:event:${eventId}`;
    if (await isProcessed(redisKey)) {
        logger.info(`Webhook ${eventId} already processed (Redis). Skipping.`);
        return { processed: false, action: 'duplicate_redis' };
    }

    // Layer 2: MongoDB idempotency check
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent) {
        logger.info(`Webhook ${eventId} already processed (DB). Skipping.`);
        await markProcessed(redisKey); // warm Redis cache
        return { processed: false, action: 'duplicate_db' };
    }

    // Mark in Redis before processing to prevent concurrent handlers
    await markProcessed(redisKey);

    // Process the event
    let action = 'ignored';

    switch (eventType) {
        case 'payment_intent.succeeded':
            action = await handlePaymentIntentSucceeded(event.data.object);
            break;

        case 'payment_intent.payment_failed':
            action = await handlePaymentIntentFailed(event.data.object);
            break;

        case 'charge.refunded':
            action = await handleChargeRefunded(event.data.object);
            break;

        default:
            logger.info(`Webhook event ${eventType} not handled. Skipping.`);
    }

    // Persist to MongoDB for audit trail
    await WebhookEvent.create({
        eventId,
        eventType,
        payload: event.data?.object ? { id: event.data.object.id, amount: event.data.object.amount } : {},
    });

    logger.info(`Webhook ${eventId} (${eventType}) processed: ${action}`);
    return { processed: true, action };
};

/**
 * Handle payment_intent.succeeded — update order to paid.
 */
async function handlePaymentIntentSucceeded(paymentIntent: any): Promise<string> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const orderId = paymentIntent.metadata?.order_id;
        if (!orderId) {
            logger.warn('Payment intent succeeded but no order_id in metadata');
            await session.abortTransaction();
            return 'no_order_id';
        }

        const order = await Order.findById(orderId).session(session);
        if (!order) {
            logger.warn(`Order ${orderId} not found for payment intent ${paymentIntent.id}`);
            await session.abortTransaction();
            return 'order_not_found';
        }

        // Only transition pending → paid (idempotent — don't overwrite if already paid)
        if (order.paymentStatus !== 'pending') {
            logger.info(`Order ${orderId} already has paymentStatus=${order.paymentStatus}. Skipping.`);
            await session.abortTransaction();
            return 'already_paid';
        }

        order.paymentStatus = 'paid';
        order.stripePaymentIntentId = paymentIntent.id;
        await order.save({ session });

        // Create ledger entry for the payment
        const userId = order.user.toString();
        await createLedgerEntry({
            userId,
            type: 'debit',
            amount: paymentIntent.amount / 100,    // cents to rupees
            category: 'payment',
            reference: `Payment for order ${order.orderNumber}`,
            orderId: order._id as string,
            stripePaymentIntentId: paymentIntent.id,
        });

        await session.commitTransaction();
        return 'payment_confirmed';
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

/**
 * Handle payment_intent.payment_failed — mark order payment as failed.
 */
async function handlePaymentIntentFailed(paymentIntent: any): Promise<string> {
    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) return 'no_order_id';

    await Order.findByIdAndUpdate(orderId, { paymentStatus: 'pending' }); // keep as pending, allow retry
    return 'payment_failed_recorded';
}

/**
 * Handle charge.refunded — credit user wallet via ledger.
 */
async function handleChargeRefunded(charge: any): Promise<string> {
    const orderId = charge.metadata?.order_id;
    if (!orderId) return 'no_order_id';

    const order = await Order.findById(orderId);
    if (!order) return 'order_not_found';

    const refundAmount = charge.amount_refunded / 100;

    await createLedgerEntry({
        userId: order.user.toString(),
        type: 'credit',
        amount: refundAmount,
        category: 'refund',
        reference: `Stripe refund for order ${order.orderNumber}`,
        orderId: order._id as string,
        stripePaymentIntentId: charge.payment_intent,
    });

    order.paymentStatus = 'refunded';
    await order.save();

    return 'refund_processed';
}

/**
 * Verify Stripe webhook signature.
 */
export const verifyWebhookSignature = (payload: Buffer, signature: string): any => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};
