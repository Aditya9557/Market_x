import { Request, Response } from 'express';
import { verifyWebhookSignature, processWebhookEvent } from '../services/webhookService';
import logger from '../config/logger';

/**
 * @route   POST /api/payments/webhook
 * @desc    Stripe webhook endpoint — verifies signature, idempotent event processing
 * @access  Public (Stripe sends directly)
 * 
 * IMPORTANT: This route must use express.raw() middleware, NOT express.json().
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
        res.status(400).json({ message: 'Missing stripe-signature header' });
        return;
    }

    let event: any;

    try {
        event = verifyWebhookSignature(req.body, signature);
    } catch (err: any) {
        logger.error(`Webhook signature verification failed: ${err.message}`);
        res.status(400).json({ message: `Webhook signature verification failed: ${err.message}` });
        return;
    }

    try {
        const result = await processWebhookEvent(event);
        res.status(200).json({ received: true, ...result });
    } catch (err: any) {
        logger.error(`Webhook processing error: ${err.message}`);
        // Return 200 to Stripe anyway to avoid retries for app errors
        // (Stripe will retry on 4xx/5xx, which could cause duplication)
        res.status(200).json({ received: true, error: err.message });
    }
};
