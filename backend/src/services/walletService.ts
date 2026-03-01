import mongoose from 'mongoose';
import User from '../models/User';
import LedgerEntry from '../models/LedgerEntry';
import logger from '../config/logger';

/**
 * Wallet Ledger Service — all wallet mutations go through here.
 * Every change produces an immutable LedgerEntry.
 * Balance is updated atomically with the ledger write inside a MongoDB transaction.
 */

interface LedgerParams {
    userId: string | mongoose.Types.ObjectId;
    type: 'credit' | 'debit';
    amount: number;
    category: string;
    reference: string;
    orderId?: string | mongoose.Types.ObjectId;
    disputeId?: string | mongoose.Types.ObjectId;
    stripePaymentIntentId?: string;
    razorpayPaymentId?: string;
    metadata?: Record<string, any>;
}

/**
 * Create an immutable ledger entry and update the user's wallet balance atomically.
 * Uses a MongoDB transaction to ensure consistency.
 */
export const createLedgerEntry = async (params: LedgerParams): Promise<any> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await User.findById(params.userId).session(session);
        if (!user) throw new Error('User not found');

        const currentBalance = user.walletBalance || 0;
        const newBalance = params.type === 'credit'
            ? currentBalance + params.amount
            : currentBalance - params.amount;

        if (params.type === 'debit' && newBalance < 0) {
            throw new Error('Insufficient wallet balance');
        }

        // Create immutable ledger entry
        const [entry] = await LedgerEntry.create([{
            user: params.userId,
            type: params.type,
            amount: params.amount,
            balanceAfter: newBalance,
            category: params.category,
            reference: params.reference,
            orderId: params.orderId,
            disputeId: params.disputeId,
            stripePaymentIntentId: params.stripePaymentIntentId,
            razorpayPaymentId: params.razorpayPaymentId,
            metadata: params.metadata,
        }], { session });

        // Update user wallet balance
        user.walletBalance = newBalance;
        await user.save({ session });

        await session.commitTransaction();

        logger.info(`Ledger: ${params.type} ₹${params.amount} for user ${params.userId} — ${params.reference}`);

        return entry;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Get user's ledger history with pagination.
 */
export const getLedgerHistory = async (userId: string, page = 1, limit = 20) => {
    const entries = await LedgerEntry.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await LedgerEntry.countDocuments({ user: userId });

    return { entries, total, page, pages: Math.ceil(total / limit) };
};

/**
 * Reconciliation: verify wallet balance matches sum of ledger entries.
 */
export const reconcileBalance = async (userId: string): Promise<{
    walletBalance: number;
    ledgerBalance: number;
    isConsistent: boolean;
}> => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const result = await LedgerEntry.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalCredits: {
                    $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] }
                },
                totalDebits: {
                    $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] }
                },
            }
        }
    ]);

    const ledgerBalance = result.length > 0
        ? result[0].totalCredits - result[0].totalDebits
        : 0;

    const isConsistent = Math.abs((user.walletBalance || 0) - ledgerBalance) < 0.01;

    if (!isConsistent) {
        logger.warn(`Wallet reconciliation mismatch for user ${userId}: wallet=${user.walletBalance}, ledger=${ledgerBalance}`);
    }

    return {
        walletBalance: user.walletBalance || 0,
        ledgerBalance,
        isConsistent,
    };
};
