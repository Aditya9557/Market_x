/**
 * Unit tests for dispute resolution service.
 * Tests creation, resolution with wallet credit, and duplicate prevention.
 */

jest.mock('../models/Dispute');
jest.mock('../models/Order');
jest.mock('../models/LedgerEntry');
jest.mock('../models/User');
jest.mock('../config/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

// Mock walletService to avoid deep DB chains
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
        Types: actual.Types,
    };
});

import { createDispute, resolveDispute } from '../services/disputeService';
import Dispute from '../models/Dispute';
import Order from '../models/Order';
import mongoose from 'mongoose';

// Valid ObjectId for test
const validObjectId = new mongoose.Types.ObjectId().toString();

describe('Dispute Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createDispute', () => {
        it('should reject if order not found', async () => {
            (Order.findById as jest.Mock).mockResolvedValueOnce(null);

            await expect(createDispute({
                userId: 'user1',
                orderId: 'order1',
                reason: 'wrong_item',
                description: 'I received the wrong item',
            })).rejects.toThrow('Order not found');
        });

        it('should reject if user does not own the order', async () => {
            (Order.findById as jest.Mock).mockResolvedValueOnce({
                user: { toString: () => 'other_user' },
            });

            await expect(createDispute({
                userId: 'user1',
                orderId: 'order1',
                reason: 'wrong_item',
                description: 'I received the wrong item',
            })).rejects.toThrow('You can only dispute your own orders');
        });

        it('should reject duplicate open disputes', async () => {
            (Order.findById as jest.Mock).mockResolvedValueOnce({
                user: { toString: () => 'user1' },
                store: 'store1',
            });
            (Dispute.findOne as jest.Mock).mockResolvedValueOnce({ _id: 'existing' });

            await expect(createDispute({
                userId: 'user1',
                orderId: 'order1',
                reason: 'wrong_item',
                description: 'I received the wrong item',
            })).rejects.toThrow('already open');
        });

        it('should create dispute successfully', async () => {
            (Order.findById as jest.Mock).mockResolvedValueOnce({
                user: { toString: () => 'user1' },
                store: 'store1',
                heroId: 'hero1',
            });
            (Dispute.findOne as jest.Mock).mockResolvedValueOnce(null);
            (Dispute.create as jest.Mock).mockResolvedValueOnce({
                _id: 'dispute1',
                status: 'open',
                reason: 'wrong_item',
            });

            const result = await createDispute({
                userId: 'user1',
                orderId: 'order1',
                reason: 'wrong_item',
                description: 'I received the wrong item',
            });

            expect(result.status).toBe('open');
            expect(Dispute.create).toHaveBeenCalled();
        });
    });

    describe('resolveDispute', () => {
        it('should reject if dispute already resolved', async () => {
            const mockDispute = { status: 'resolved' };
            (Dispute.findById as jest.Mock).mockReturnValueOnce({
                session: jest.fn().mockResolvedValue(mockDispute),
            });

            await expect(resolveDispute({
                disputeId: validObjectId,
                adminId: validObjectId,
                resolution: 'refund_full',
            })).rejects.toThrow('already resolved');
        });

        it('should reject partial refund without amount', async () => {
            const mockDispute = {
                _id: validObjectId,
                status: 'open',
                order: validObjectId,
                user: { toString: () => validObjectId },
                save: jest.fn().mockResolvedValue(true),
            };
            (Dispute.findById as jest.Mock).mockReturnValueOnce({
                session: jest.fn().mockResolvedValue(mockDispute),
            });
            (Order.findById as jest.Mock).mockReturnValueOnce({
                session: jest.fn().mockResolvedValue({ total: 500 }),
            });

            await expect(resolveDispute({
                disputeId: validObjectId,
                adminId: validObjectId,
                resolution: 'refund_partial',
                refundAmount: 0,
            })).rejects.toThrow('Refund amount must be positive');
        });
    });
});
