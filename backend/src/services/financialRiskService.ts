import mongoose from 'mongoose';
import FinancialRiskScore from '../models/FinancialRiskScore';
import LedgerEntry from '../models/LedgerEntry';
import Order from '../models/Order';
import User from '../models/User';
import RiskFlag from '../models/RiskFlag';
import logger from '../config/logger';
import { getRedis } from '../config/redis';

/**
 * FinancialRiskService — computes per-user dynamic risk scores.
 * High risk → require OTP re-verification on checkout.
 */

export const evaluateUserRisk = async (userId: string): Promise<any> => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const uid = new mongoose.Types.ObjectId(userId);

    // 1. Refund frequency ratio
    const [totalOrders, refundCount] = await Promise.all([
        Order.countDocuments({ user: userId, type: 'parent', createdAt: { $gte: thirtyDaysAgo } }),
        LedgerEntry.countDocuments({ user: uid, category: 'refund', createdAt: { $gte: thirtyDaysAgo } }),
    ]);
    const refundRatio = totalOrders > 0 ? refundCount / totalOrders : 0;
    const refundFrequencyScore = Math.min(100, Math.round(refundRatio * 200));

    // 2. Rapid checkout pattern (multiple orders within 2 min)
    let rapidCheckoutScore = 0;
    try {
        const redis = getRedis();
        const key = `risk:rapid:${userId}`;
        const count = parseInt(await redis.get(key) || '0');
        rapidCheckoutScore = Math.min(100, count * 20);
    } catch { /* Redis down */ }

    // 3. Wallet drain velocity
    const withdrawals = await LedgerEntry.aggregate([
        { $match: { user: uid, type: 'debit', createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const withdrawalVelocity = withdrawals[0]?.count || 0;
    const walletDrainScore = Math.min(100, withdrawalVelocity * 15);

    // 4. Multi-account score (from existing RiskFlags)
    const multiAccountFlags = await RiskFlag.countDocuments({
        userId: uid, reason: 'multiple_accounts_suspected', resolved: false,
    });
    const multiAccountScore = Math.min(100, multiAccountFlags * 40);

    // 5. Velocity score
    const velocityFlags = await RiskFlag.countDocuments({
        userId: uid, reason: 'velocity_fraud', resolved: false,
    });
    const velocityScore = Math.min(100, velocityFlags * 50);

    // 6. Chargeback score
    const chargebackFlags = await RiskFlag.countDocuments({
        userId: uid, reason: 'chargeback_filed', resolved: false,
    });
    const chargebackScore = Math.min(100, chargebackFlags * 60);

    // Composite weighted score
    const score = Math.round(
        refundFrequencyScore * 0.25 +
        rapidCheckoutScore * 0.15 +
        walletDrainScore * 0.15 +
        multiAccountScore * 0.20 +
        velocityScore * 0.15 +
        chargebackScore * 0.10
    );

    const level = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
    const requiresOtp = score >= 50;
    const isBlocked = score >= 85;

    const result = await FinancialRiskScore.findOneAndUpdate(
        { userId: uid },
        {
            score, level,
            refundFrequencyScore, rapidCheckoutScore, walletDrainScore,
            multiAccountScore, velocityScore, chargebackScore,
            requiresOtp, isBlocked,
            lastEvaluatedAt: now,
            $inc: { evaluationCount: 1 },
        },
        { upsert: true, new: true }
    );

    if (score >= 50) {
        logger.warn(`High financial risk detected for user ${userId}`, { score, level });
    }

    return result;
};

export const getUserRiskScore = async (userId: string) => {
    let score = await FinancialRiskScore.findOne({ userId }).lean();
    if (!score) score = await evaluateUserRisk(userId);
    return score;
};

export const getHighRiskUsers = async (limit = 50) => {
    return FinancialRiskScore.find({ level: { $in: ['high', 'critical'] } })
        .populate('userId', 'name email role')
        .sort({ score: -1 }).limit(limit).lean();
};

export const trackRapidCheckout = async (userId: string): Promise<void> => {
    try {
        const redis = getRedis();
        const key = `risk:rapid:${userId}`;
        await redis.incr(key);
        await redis.expire(key, 120); // 2-minute window
    } catch { /* noop */ }
};
