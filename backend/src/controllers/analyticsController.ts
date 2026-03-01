import { Request, Response } from 'express';
import Order from '../models/Order';
import Dispute from '../models/Dispute';
import Delivery from '../models/Delivery';
import Store from '../models/Store';
import User from '../models/User';

/**
 * @route   GET /api/admin/stats/overview
 * @desc    Admin analytics — GMV, orders/day, hero acceptance rate, pending disputes
 */
export const getAdminOverview = async (_req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Parallel aggregation queries
        const [
            gmvResult,
            ordersToday,
            ordersLast30d,
            pendingDisputes,
            totalStores,
            pendingStores,
            totalUsers,
            activeHeroes,
            heroAcceptanceRate,
            revenueByDay,
        ] = await Promise.all([
            // GMV (Gross Merchandise Value) — sum of all non-cancelled parent order totals
            Order.aggregate([
                { $match: { type: 'parent', status: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
            ]),

            // Today's orders
            Order.countDocuments({ type: 'parent', createdAt: { $gte: todayStart } }),

            // Last 30 days orders
            Order.countDocuments({ type: 'parent', createdAt: { $gte: thirtyDaysAgo } }),

            // Pending disputes
            Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),

            // Total approved stores
            Store.countDocuments({ status: 'approved' }),

            // Pending stores
            Store.countDocuments({ status: 'pending' }),

            // Total users
            User.countDocuments(),

            // Active heroes (online in last 24h)
            User.countDocuments({
                role: 'hero',
                status: 'active',
            }),

            // Hero acceptance rate (accepted deliveries / total available orders, last 7 days)
            (async () => {
                const readyOrders = await Order.countDocuments({
                    type: 'child',
                    orderType: 'delivery',
                    createdAt: { $gte: sevenDaysAgo },
                });
                const acceptedDeliveries = await Delivery.countDocuments({
                    status: { $ne: 'cancelled' },
                    createdAt: { $gte: sevenDaysAgo },
                });
                return readyOrders > 0 ? ((acceptedDeliveries / readyOrders) * 100) : 0;
            })(),

            // Revenue by day (last 7 days)
            Order.aggregate([
                {
                    $match: {
                        type: 'parent',
                        status: { $ne: 'cancelled' },
                        createdAt: { $gte: sevenDaysAgo },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                        },
                        revenue: { $sum: '$total' },
                        orders: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        res.json({
            gmv: gmvResult.length > 0 ? gmvResult[0].total : 0,
            totalOrders: gmvResult.length > 0 ? gmvResult[0].count : 0,
            ordersToday,
            ordersLast30d,
            pendingDisputes,
            totalStores,
            pendingStores,
            totalUsers,
            activeHeroes,
            heroAcceptanceRate: parseFloat(heroAcceptanceRate.toFixed(1)),
            revenueByDay,
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};
