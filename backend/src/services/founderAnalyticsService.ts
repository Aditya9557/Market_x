import mongoose from 'mongoose';
import Order from '../models/Order';
import User from '../models/User';
import Delivery from '../models/Delivery';
import LedgerEntry from '../models/LedgerEntry';
import Dispute from '../models/Dispute';
import BusinessSnapshot from '../models/BusinessSnapshot';
import DeliveryDriver from '../models/DeliveryDriver';
import logger from '../config/logger';

/**
 * FounderAnalyticsService — computes daily KPI snapshots.
 * Called nightly by businessAnalyticsWorker cron.
 * Powers the Founder Dashboard and Investor Metrics Export.
 */

export const computeDailySnapshot = async (targetDate?: Date, campusId = 'all'): Promise<any> => {
    const date = targetDate || new Date();
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(dayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(dayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
        // ── Revenue Metrics ─────────────────────────────────────────
        const [gmvResult, commissionResult, deliveryRevenueResult] = await Promise.all([
            Order.aggregate([
                { $match: { type: 'parent', status: { $ne: 'cancelled' }, createdAt: { $gte: dayStart, $lt: dayEnd } } },
                { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                { $match: { type: 'child', status: { $ne: 'cancelled' }, createdAt: { $gte: dayStart, $lt: dayEnd } } },
                { $group: { _id: null, total: { $sum: '$commission' } } },
            ]),
            Order.aggregate([
                { $match: { type: 'child', orderType: 'delivery', status: 'delivered', createdAt: { $gte: dayStart, $lt: dayEnd } } },
                { $group: { _id: null, total: { $sum: '$deliveryFee' } } },
            ]),
        ]);

        const gmv = gmvResult[0]?.total || 0;
        const totalOrders = gmvResult[0]?.count || 0;
        const commissionRevenue = commissionResult[0]?.total || 0;
        const deliveryRevenue = (deliveryRevenueResult[0]?.total || 0) * 0.3; // platform keeps ~30%
        const platformNetRevenue = commissionRevenue + deliveryRevenue;
        const averageOrderValue = totalOrders > 0 ? gmv / totalOrders : 0;

        // ── Order Quality ───────────────────────────────────────────
        const [deliveredOrders, cancelledOrders] = await Promise.all([
            Order.countDocuments({ type: 'parent', status: 'delivered', createdAt: { $gte: dayStart, $lt: dayEnd } }),
            Order.countDocuments({ type: 'parent', status: 'cancelled', createdAt: { $gte: dayStart, $lt: dayEnd } }),
        ]);
        const cancellationPct = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

        // ── Refund Metric ───────────────────────────────────────────
        const refundResult = await LedgerEntry.aggregate([
            { $match: { category: 'refund', createdAt: { $gte: dayStart, $lt: dayEnd } } },
            { $group: { _id: null, count: { $sum: 1 } } },
        ]);
        const refundCount = refundResult[0]?.count || 0;
        const refundPct = totalOrders > 0 ? (refundCount / totalOrders) * 100 : 0;

        // ── User Metrics ────────────────────────────────────────────
        const [totalUsers, newUsers] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }),
        ]);

        // Active users: ordered in last 30 days
        const activeUsersResult = await Order.aggregate([
            { $match: { type: 'parent', createdAt: { $gte: thirtyDaysAgo, $lt: dayEnd } } },
            { $group: { _id: '$user' } },
            { $count: 'count' },
        ]);
        const activeUsers = activeUsersResult[0]?.count || 0;
        const ordersPerActiveUser = activeUsers > 0
            ? await Order.countDocuments({ type: 'parent', createdAt: { $gte: thirtyDaysAgo, $lt: dayEnd } }) / activeUsers
            : 0;

        // Repeat purchase: users with > 1 order in last 30 days
        const repeatResult = await Order.aggregate([
            { $match: { type: 'parent', createdAt: { $gte: thirtyDaysAgo, $lt: dayEnd } } },
            { $group: { _id: '$user', orderCount: { $sum: 1 } } },
            { $match: { orderCount: { $gt: 1 } } },
            { $count: 'count' },
        ]);
        const repeatPurchasePct = activeUsers > 0
            ? ((repeatResult[0]?.count || 0) / activeUsers) * 100
            : 0;

        // ── Hero Metrics ────────────────────────────────────────────
        const totalHeroes = await User.countDocuments({ role: 'hero' });
        const activeHeroResult = await Delivery.aggregate([
            { $match: { status: 'delivered', createdAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: '$hero' } },
            { $count: 'count' },
        ]);
        const activeHeroes = activeHeroResult[0]?.count || 0;
        const heroUtilizationRate = totalHeroes > 0 ? (activeHeroes / totalHeroes) * 100 : 0;

        // Average hero earning (last 7 days)
        const heroEarningResult = await LedgerEntry.aggregate([
            { $match: { category: 'delivery_earning', type: 'credit', createdAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const avgHeroEarning = activeHeroes > 0 ? (heroEarningResult[0]?.total || 0) / activeHeroes : 0;

        // ── Retention Metrics ───────────────────────────────────────
        const usersSignedUp7dAgo = await User.countDocuments({
            createdAt: { $gte: new Date(sevenDaysAgo.getTime() - 24 * 60 * 60 * 1000), $lt: sevenDaysAgo },
        });
        const usersActive7dLater = usersSignedUp7dAgo > 0
            ? await Order.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo } } },
                { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'u' } },
                { $unwind: '$u' },
                { $match: { 'u.createdAt': { $gte: new Date(sevenDaysAgo.getTime() - 24 * 60 * 60 * 1000), $lt: sevenDaysAgo } } },
                { $group: { _id: '$user' } },
                { $count: 'count' },
            ]).then(r => r[0]?.count || 0)
            : 0;
        const day7Retention = usersSignedUp7dAgo > 0 ? (usersActive7dLater / usersSignedUp7dAgo) * 100 : 0;

        const usersSignedUp30dAgo = await User.countDocuments({
            createdAt: { $gte: new Date(thirtyDaysAgo.getTime() - 24 * 60 * 60 * 1000), $lt: thirtyDaysAgo },
        });
        const day30Retention = usersSignedUp30dAgo > 0 ? (activeUsers / totalUsers) * 100 : 0;

        // ── Peak Hour Analysis (7-10 PM) ────────────────────────────
        const peakOrders = await Order.countDocuments({
            type: 'parent',
            createdAt: {
                $gte: new Date(dayStart.getTime() + 19 * 60 * 60 * 1000), // 7 PM
                $lt: new Date(dayStart.getTime() + 22 * 60 * 60 * 1000),  // 10 PM
            },
        });
        const peakHourPct = totalOrders > 0 ? (peakOrders / totalOrders) * 100 : 0;

        // ── Financial Estimates ─────────────────────────────────────
        const ltvEstimate = activeUsers > 0 ? (gmv * 12) / activeUsers : 0; // annualized
        const contributionMargin = totalOrders > 0 ? platformNetRevenue / totalOrders : 0;

        // ── Upsert Snapshot ─────────────────────────────────────────
        const snapshot = await BusinessSnapshot.findOneAndUpdate(
            { date: dayStart, campusId },
            {
                date: dayStart,
                campusId,
                gmv,
                platformNetRevenue,
                deliveryRevenue,
                commissionRevenue,
                totalOrders,
                deliveredOrders,
                cancelledOrders,
                averageOrderValue: Math.round(averageOrderValue * 100) / 100,
                totalUsers,
                activeUsers,
                newUsers,
                ordersPerActiveUser: Math.round(ordersPerActiveUser * 100) / 100,
                totalHeroes,
                activeHeroes,
                heroUtilizationRate: Math.round(heroUtilizationRate * 100) / 100,
                avgHeroEarning: Math.round(avgHeroEarning * 100) / 100,
                cancellationPct: Math.round(cancellationPct * 100) / 100,
                refundPct: Math.round(refundPct * 100) / 100,
                repeatPurchasePct: Math.round(repeatPurchasePct * 100) / 100,
                ltvEstimate: Math.round(ltvEstimate),
                cacEstimate: 0, // manually updated
                contributionMargin: Math.round(contributionMargin * 100) / 100,
                burnEstimate: 0, // manually updated
                day7Retention: Math.round(day7Retention * 100) / 100,
                day30Retention: Math.round(day30Retention * 100) / 100,
                peakHourOrders: peakOrders,
                peakHourPct: Math.round(peakHourPct * 100) / 100,
            },
            { upsert: true, new: true }
        );

        logger.info(`BusinessSnapshot computed for ${dayStart.toISOString().slice(0, 10)}: GMV=₹${gmv}, Orders=${totalOrders}`);
        return snapshot;
    } catch (err: any) {
        logger.error('Failed to compute daily snapshot', { error: err.message });
        throw err;
    }
};

/**
 * Get snapshots for dashboard rendering.
 */
export const getSnapshots = async (days = 30, campusId = 'all') => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return BusinessSnapshot.find({ campusId, date: { $gte: since } }).sort({ date: 1 }).lean();
};

/**
 * Get growth trends — compares current period vs previous period.
 */
export const getGrowthTrend = async (days = 7, campusId = 'all') => {
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);

    const [currentPeriod, prevPeriod] = await Promise.all([
        BusinessSnapshot.find({ campusId, date: { $gte: currentStart } }).lean(),
        BusinessSnapshot.find({ campusId, date: { $gte: prevStart, $lt: currentStart } }).lean(),
    ]);

    const sum = (arr: any[], key: string) => arr.reduce((s, x) => s + (x[key] || 0), 0);
    const avg = (arr: any[], key: string) => arr.length ? sum(arr, key) / arr.length : 0;

    return {
        current: {
            gmv: sum(currentPeriod, 'gmv'),
            revenue: sum(currentPeriod, 'platformNetRevenue'),
            orders: sum(currentPeriod, 'totalOrders'),
            avgAOV: avg(currentPeriod, 'averageOrderValue'),
            activeUsers: avg(currentPeriod, 'activeUsers'),
        },
        previous: {
            gmv: sum(prevPeriod, 'gmv'),
            revenue: sum(prevPeriod, 'platformNetRevenue'),
            orders: sum(prevPeriod, 'totalOrders'),
            avgAOV: avg(prevPeriod, 'averageOrderValue'),
            activeUsers: avg(prevPeriod, 'activeUsers'),
        },
        growth: {
            gmv: calcGrowth(sum(currentPeriod, 'gmv'), sum(prevPeriod, 'gmv')),
            revenue: calcGrowth(sum(currentPeriod, 'platformNetRevenue'), sum(prevPeriod, 'platformNetRevenue')),
            orders: calcGrowth(sum(currentPeriod, 'totalOrders'), sum(prevPeriod, 'totalOrders')),
        },
    };
};

const calcGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 10000) / 100;
};
