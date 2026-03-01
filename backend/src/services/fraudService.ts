import RiskFlag, { RiskFlagReason, RiskSeverity } from '../models/RiskFlag';
import LedgerEntry from '../models/LedgerEntry';
import User from '../models/User';
import logger from '../config/logger';
import { getRedis } from '../config/redis';

const REFUND_WINDOW_SECONDS = 7 * 24 * 60 * 60; // 7 days
const DEFAULT_REFUND_CAP = 500; // ₹500/week — override with CampusConfig

/**
 * Check and enforce refund cap. Returns true if refund is allowed.
 * If exceeded, creates a RiskFlag automatically.
 */
export const checkRefundCap = async (
    userId: string,
    refundAmount: number,
    ipAddress: string,
    weeklyCapOverride?: number
): Promise<{ allowed: boolean; weeklyTotal: number; cap: number }> => {
    const cap = weeklyCapOverride ?? DEFAULT_REFUND_CAP;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Sum all refunds in last 7 days
    const refundAgg = await LedgerEntry.aggregate([
        {
            $match: {
                user: { $eq: new (require('mongoose').Types.ObjectId)(userId) },
                category: 'refund',
                type: 'credit',
                createdAt: { $gte: oneWeekAgo },
            },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const weeklyTotal = refundAgg[0]?.total || 0;
    const projectedTotal = weeklyTotal + refundAmount;

    if (projectedTotal > cap) {
        // Flag the user
        const existingFlag = await RiskFlag.findOne({
            userId,
            reason: 'refund_cap_exceeded',
            resolved: false,
        });

        if (!existingFlag) {
            await RiskFlag.create({
                userId,
                reason: 'refund_cap_exceeded' as RiskFlagReason,
                severity: projectedTotal > cap * 2 ? 'high' : 'medium' as RiskSeverity,
                ipAddress,
                metadata: {
                    weeklyTotal,
                    refundAmount,
                    projectedTotal,
                    cap,
                },
            });
            logger.warn('Refund cap exceeded — risk flag created', { userId, weeklyTotal, refundAmount, cap });
        }
        return { allowed: false, weeklyTotal, cap };
    }

    return { allowed: true, weeklyTotal, cap };
};

/**
 * Detect potential multi-account fraud: same IP across multiple accounts.
 * Flags if >= 3 accounts have logged in from the same IP in 24h.
 */
export const detectMultiAccount = async (
    userId: string,
    ipAddress: string
): Promise<void> => {
    try {
        const redis = getRedis();
        const key = `ip:logins:${ipAddress}`;

        // Track unique userIds per IP in 24h window
        await redis.sadd(key, userId);
        await redis.expire(key, 24 * 60 * 60);
        const count = await redis.scard(key);

        if (count >= 3) {
            // Check if already flagged
            const existing = await RiskFlag.findOne({
                userId,
                reason: 'multiple_accounts_suspected',
                resolved: false,
            });
            if (!existing) {
                await RiskFlag.create({
                    userId,
                    reason: 'multiple_accounts_suspected' as RiskFlagReason,
                    severity: count >= 5 ? 'high' : 'medium' as RiskSeverity,
                    ipAddress,
                    metadata: { accountCountFromIp: count, ip: ipAddress },
                });
                logger.warn('Multi-account suspected', { userId, ipAddress, count });
            }
        }
    } catch (err: any) {
        // Redis may be down — log and continue
        logger.error('Multi-account detection error', { error: err.message });
    }
};

/**
 * Check velocity fraud: too many orders in short window.
 */
export const checkOrderVelocity = async (
    userId: string,
    ipAddress: string
): Promise<boolean> => {
    try {
        const redis = getRedis();
        const key = `velocity:orders:${userId}`;
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, 3600); // 1-hour window

        if (count > 20) {
            const existing = await RiskFlag.findOne({
                userId,
                reason: 'velocity_fraud',
                resolved: false,
            });
            if (!existing) {
                await RiskFlag.create({
                    userId,
                    reason: 'velocity_fraud' as RiskFlagReason,
                    severity: 'high',
                    ipAddress,
                    metadata: { ordersInHour: count },
                });
            }
            return false; // block
        }
        return true;
    } catch {
        return true; // fail-open
    }
};

/**
 * Get unresolved risk flags for admin dashboard.
 */
export const getUnresolvedFlags = async (limit = 50) => {
    return RiskFlag.find({ resolved: false })
        .populate('userId', 'name email role')
        .sort({ severity: -1, createdAt: -1 })
        .limit(limit)
        .lean();
};

/**
 * Resolve a risk flag.
 */
export const resolveFlag = async (
    flagId: string,
    adminId: string,
    note: string
): Promise<void> => {
    await RiskFlag.findByIdAndUpdate(flagId, {
        resolved: true,
        resolvedBy: adminId,
        resolvedAt: new Date(),
        resolvedNote: note,
    });
};
