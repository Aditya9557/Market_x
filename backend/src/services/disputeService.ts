import mongoose from 'mongoose';
import Dispute from '../models/Dispute';
import Order from '../models/Order';
import { createLedgerEntry } from './walletService';
import logger from '../config/logger';

/**
 * Dispute Service — handles dispute creation and resolution.
 * Resolution with refund/credit creates immutable ledger entries (never mutates old transactions).
 */

interface CreateDisputeParams {
    userId: string;
    orderId: string;
    reason: string;
    description: string;
}

export const createDispute = async (params: CreateDisputeParams) => {
    const order = await Order.findById(params.orderId);
    if (!order) throw new Error('Order not found');

    // Check if user owns this order
    if (order.user.toString() !== params.userId) {
        throw new Error('You can only dispute your own orders');
    }

    // Check for existing open dispute on this order
    const existing = await Dispute.findOne({
        order: params.orderId,
        status: { $in: ['open', 'under_review'] },
    });
    if (existing) throw new Error('A dispute is already open for this order');

    const dispute = await Dispute.create({
        order: params.orderId,
        user: params.userId,
        store: order.store,
        heroId: order.heroId,
        reason: params.reason,
        description: params.description,
        status: 'open',
    });

    logger.info(`Dispute created: ${dispute._id} for order ${params.orderId} by user ${params.userId}`);

    return dispute;
};

interface ResolveDisputeParams {
    disputeId: string;
    adminId: string;
    resolution: string;
    adminNotes?: string;
    refundAmount?: number;
}

export const resolveDispute = async (params: ResolveDisputeParams) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const dispute = await Dispute.findById(params.disputeId).session(session);
        if (!dispute) throw new Error('Dispute not found');

        if (dispute.status === 'resolved' || dispute.status === 'rejected') {
            throw new Error('Dispute is already resolved');
        }

        const order = await Order.findById(dispute.order).session(session);
        if (!order) throw new Error('Associated order not found');

        dispute.resolution = params.resolution as any;
        dispute.adminNotes = params.adminNotes;
        dispute.resolvedBy = new mongoose.Types.ObjectId(params.adminId);
        dispute.resolvedAt = new Date();

        // Determine refund amount
        let creditAmount = 0;
        if (params.resolution === 'refund_full') {
            creditAmount = order.total;
        } else if (params.resolution === 'refund_partial' || params.resolution === 'wallet_credit') {
            creditAmount = params.refundAmount || 0;
            if (creditAmount <= 0) throw new Error('Refund amount must be positive');
            if (creditAmount > order.total) throw new Error('Refund amount cannot exceed order total');
        }

        dispute.refundAmount = creditAmount;
        dispute.status = params.resolution === 'rejected' ? 'rejected' : 'resolved';

        await dispute.save({ session });

        // Credit user wallet if applicable (creates immutable ledger entry)
        if (creditAmount > 0) {
            await createLedgerEntry({
                userId: dispute.user.toString(),
                type: 'credit',
                amount: creditAmount,
                category: 'dispute_credit',
                reference: `Dispute resolution #${dispute._id} — ${params.resolution}`,
                orderId: dispute.order.toString(),
                disputeId: dispute._id as string,
                metadata: {
                    resolution: params.resolution,
                    adminId: params.adminId,
                    originalOrderTotal: order.total,
                },
            });
        }

        await session.commitTransaction();

        logger.info(`Dispute ${params.disputeId} resolved: ${params.resolution}, credited ₹${creditAmount}`);

        return dispute;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const getDisputesByStatus = async (status?: string, page = 1, limit = 20) => {
    const query: any = {};
    if (status) query.status = status;

    const disputes = await Dispute.find(query)
        .populate('user', 'name email')
        .populate('order', 'orderNumber total')
        .populate('store', 'name')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await Dispute.countDocuments(query);

    return { disputes, total, page, pages: Math.ceil(total / limit) };
};
