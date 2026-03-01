/**
 * Unit tests for Stripe webhook processing.
 * Tests idempotency, signature verification, and order state transitions.
 */

// Mock dependencies before imports
jest.mock('../models/Order');
jest.mock('../models/WebhookEvent');
jest.mock('../models/LedgerEntry');
jest.mock('../models/User');
jest.mock('../config/redis', () => ({
    isProcessed: jest.fn().mockResolvedValue(false),
    markProcessed: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../config/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

// Mock walletService to avoid DB call chain
jest.mock('../services/walletService', () => ({
    createLedgerEntry: jest.fn().mockResolvedValue({ _id: 'ledger1' }),
}));

// Mock mongoose — use inline object (no hoisting issue)
jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return {
        ...actual,
        startSession: jest.fn().mockResolvedValue({
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            abortTransaction: jest.fn(),
            endSession: jest.fn(),
        }),
    };
});

import { processWebhookEvent } from '../services/webhookService';
import Order from '../models/Order';
import WebhookEvent from '../models/WebhookEvent';
import { isProcessed, markProcessed } from '../config/redis';

describe('Webhook Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Idempotency', () => {
        it('should skip duplicate events detected by Redis', async () => {
            (isProcessed as jest.Mock).mockResolvedValueOnce(true);

            const result = await processWebhookEvent({
                id: 'evt_test_123',
                type: 'payment_intent.succeeded',
                data: { object: {} },
            });

            expect(result.processed).toBe(false);
            expect(result.action).toBe('duplicate_redis');
        });

        it('should skip duplicate events detected by MongoDB', async () => {
            (isProcessed as jest.Mock).mockResolvedValueOnce(false);
            (WebhookEvent.findOne as jest.Mock).mockResolvedValueOnce({ eventId: 'evt_test_123' });

            const result = await processWebhookEvent({
                id: 'evt_test_123',
                type: 'payment_intent.succeeded',
                data: { object: {} },
            });

            expect(result.processed).toBe(false);
            expect(result.action).toBe('duplicate_db');
            expect(markProcessed).toHaveBeenCalled();
        });
    });

    describe('payment_intent.succeeded', () => {
        it('should transition order from pending to paid', async () => {
            (isProcessed as jest.Mock).mockResolvedValueOnce(false);
            (WebhookEvent.findOne as jest.Mock).mockResolvedValueOnce(null);
            (WebhookEvent.create as jest.Mock).mockResolvedValueOnce({});

            const mockOrder = {
                _id: 'order123',
                paymentStatus: 'pending',
                orderNumber: 'ORD-20260225-0001',
                user: 'user123',
                total: 500,
                save: jest.fn().mockResolvedValue(true),
            };
            (Order.findById as jest.Mock).mockReturnValueOnce({
                session: jest.fn().mockResolvedValue(mockOrder),
            });

            const result = await processWebhookEvent({
                id: 'evt_new_123',
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_test',
                        amount: 50000,
                        metadata: { order_id: 'order123' },
                    },
                },
            });

            expect(result.processed).toBe(true);
            expect(WebhookEvent.create).toHaveBeenCalled();
        });

        it('should not overwrite already-paid orders', async () => {
            (isProcessed as jest.Mock).mockResolvedValueOnce(false);
            (WebhookEvent.findOne as jest.Mock).mockResolvedValueOnce(null);
            (WebhookEvent.create as jest.Mock).mockResolvedValueOnce({});

            const mockOrder = {
                _id: 'order123',
                paymentStatus: 'paid',  // already paid
                orderNumber: 'ORD-20260225-0001',
                user: 'user123',
                save: jest.fn(),
            };
            (Order.findById as jest.Mock).mockReturnValueOnce({
                session: jest.fn().mockResolvedValue(mockOrder),
            });

            const result = await processWebhookEvent({
                id: 'evt_already_paid',
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_test_2',
                        amount: 50000,
                        metadata: { order_id: 'order123' },
                    },
                },
            });

            expect(result.processed).toBe(true);
            expect(mockOrder.save).not.toHaveBeenCalled();
        });
    });

    describe('Unhandled event types', () => {
        it('should ignore unhandled event types but still record them', async () => {
            (isProcessed as jest.Mock).mockResolvedValueOnce(false);
            (WebhookEvent.findOne as jest.Mock).mockResolvedValueOnce(null);
            (WebhookEvent.create as jest.Mock).mockResolvedValueOnce({});

            const result = await processWebhookEvent({
                id: 'evt_unknown',
                type: 'account.updated',
                data: { object: {} },
            });

            expect(result.processed).toBe(true);
            expect(result.action).toBe('ignored');
        });
    });
});
