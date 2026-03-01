import DeliveryDriver from '../models/DeliveryDriver';
import Delivery from '../models/Delivery';
import LedgerEntry from '../models/LedgerEntry';
import User from '../models/User';
import HeroRating from '../models/HeroRating';
import logger from '../config/logger';

/**
 * Full hero earnings + performance stats for dashboard.
 */
export const getHeroEconomics = async (heroUserId: string) => {
    const driver = await DeliveryDriver.findOne({ user: heroUserId }).lean();
    if (!driver) return null;

    const now = new Date();

    // ── Time windows ──────────────────────────────────────────────────────────
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);

    // ── Earnings ──────────────────────────────────────────────────────────────
    const [todayEarnings, weekEarnings, allTimeEarnings] = await Promise.all([
        sumEarnings(heroUserId, todayStart),
        sumEarnings(heroUserId, weekStart),
        sumEarnings(heroUserId),
    ]);

    // Pending payout = earned but not yet withdrawn
    const withdrawals = await LedgerEntry.aggregate([
        { $match: { user: driver.user, category: 'withdrawal', type: 'debit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalWithdrawn = withdrawals[0]?.total || 0;
    const pendingPayout = Math.max(0, allTimeEarnings - totalWithdrawn);

    // ── Delivery stats ────────────────────────────────────────────────────────
    const totalDeliveries = (driver as any).totalDeliveries || 0;
    const [todayDeliveriesCount, weekDeliveriesCount] = await Promise.all([
        Delivery.countDocuments({ hero: heroUserId, status: 'delivered', updatedAt: { $gte: todayStart } }),
        Delivery.countDocuments({ hero: heroUserId, status: 'delivered', updatedAt: { $gte: weekStart } }),
    ]);

    // ── Cancellation % ────────────────────────────────────────────────────────
    const [acceptedCount, cancelledCount] = await Promise.all([
        Delivery.countDocuments({ hero: heroUserId }),
        Delivery.countDocuments({ hero: heroUserId, status: 'cancelled' }),
    ]);
    const cancellationPct = acceptedCount > 0 ? Math.round((cancelledCount / acceptedCount) * 100) : 0;

    // ── Average delivery time (minutes) ──────────────────────────────────────
    const avgTimeAgg = await Delivery.aggregate([
        { $match: { hero: driver.user, status: 'delivered' } },
        {
            $project: {
                durationMs: { $subtract: ['$updatedAt', '$createdAt'] },
            },
        },
        { $group: { _id: null, avgMs: { $avg: '$durationMs' } } },
    ]);
    const avgDeliveryMinutes = avgTimeAgg[0]?.avgMs ? Math.round(avgTimeAgg[0].avgMs / 60000) : null;

    // ── Rating ────────────────────────────────────────────────────────────────
    const ratingAgg = await HeroRating.aggregate([
        { $match: { hero: driver.user } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const rating = ratingAgg[0]?.avg ? parseFloat(ratingAgg[0].avg.toFixed(2)) : 5.0;
    const ratingCount = ratingAgg[0]?.count || 0;

    // ── Level ─────────────────────────────────────────────────────────────────
    const reliabilityScore: number = (driver as any).reliabilityScore || 5.0;

    return {
        todayEarnings,
        weekEarnings,
        allTimeEarnings,
        pendingPayout,
        todayDeliveries: todayDeliveriesCount,
        weekDeliveries: weekDeliveriesCount,
        totalDeliveries,
        cancellationPct,
        avgDeliveryMinutes,
        rating,
        ratingCount,
        reliabilityScore,
        isOnline: (driver as any).isAvailable || false,
        vehicleType: (driver as any).vehicleType,
    };
};

const sumEarnings = async (heroUserId: string, since?: Date): Promise<number> => {
    const match: Record<string, any> = {
        user: new (require('mongoose').Types.ObjectId)(heroUserId),
        category: 'delivery_earning',
        type: 'credit',
    };
    if (since) match.createdAt = { $gte: since };
    const agg = await LedgerEntry.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return agg[0]?.total || 0;
};

/**
 * Auto-suspension rule engine. Run after every delivery update.
 * Suspends hero if reliability score < threshold OR cancellation % too high.
 */
export const evaluateHeroSuspension = async (heroUserId: string, campusMinScore = 2.0, campusMaxCancelPct = 30): Promise<{ suspended: boolean; reason?: string }> => {
    const driver = await DeliveryDriver.findOne({ user: heroUserId });
    if (!driver) return { suspended: false };

    const totalDeliveries = (driver as any).totalDeliveries || 0;
    if (totalDeliveries < 5) return { suspended: false }; // Grace period

    const reliabilityScore: number = (driver as any).reliabilityScore || 5.0;

    // Check cancellation %
    const [accepted, cancelled] = await Promise.all([
        Delivery.countDocuments({ hero: driver.user }),
        Delivery.countDocuments({ hero: driver.user, status: 'cancelled' }),
    ]);
    const cancelPct = accepted > 0 ? (cancelled / accepted) * 100 : 0;

    let shouldSuspend = false;
    let reason = '';

    if (reliabilityScore < campusMinScore) {
        shouldSuspend = true;
        reason = `Reliability score ${reliabilityScore.toFixed(1)} below minimum ${campusMinScore}`;
    } else if (cancelPct > campusMaxCancelPct) {
        shouldSuspend = true;
        reason = `Cancellation rate ${cancelPct.toFixed(1)}% exceeds limit ${campusMaxCancelPct}%`;
    }

    if (shouldSuspend && (driver as any).isAvailable) {
        await DeliveryDriver.findByIdAndUpdate(driver._id, { isAvailable: false });
        await User.findByIdAndUpdate(heroUserId, { status: 'suspended' });
        logger.warn('Hero auto-suspended', { heroUserId, reason });
        return { suspended: true, reason };
    }

    return { suspended: false };
};
