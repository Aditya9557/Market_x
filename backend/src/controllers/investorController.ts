import { Request, Response } from 'express';
import BusinessSnapshot from '../models/BusinessSnapshot';
import Order from '../models/Order';
import User from '../models/User';
import { getGrowthTrend, getSnapshots } from '../services/founderAnalyticsService';
import { getRetentionStats } from '../services/retentionService';

/**
 * @route   GET /api/admin/investor/metrics
 * @desc    Investor-grade metrics export (JSON + optional CSV)
 */
export const getInvestorMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
        const format = req.query.format as string || 'json';
        const months = parseInt(req.query.months as string) || 3;

        const daysBack = months * 30;
        const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

        const snapshots = await BusinessSnapshot.find({ campusId: 'all', date: { $gte: since } }).sort({ date: 1 }).lean();

        // Aggregate into monthly buckets
        const monthlyBuckets = new Map<string, any>();
        for (const snap of snapshots) {
            const key = (snap.date as Date).toISOString().slice(0, 7); // YYYY-MM
            if (!monthlyBuckets.has(key)) {
                monthlyBuckets.set(key, {
                    month: key, gmv: 0, revenue: 0, orders: 0, newUsers: 0, days: 0,
                    cancelledOrders: 0, activeUsers: 0, heroUtilization: 0, margin: 0
                });
            }
            const b = monthlyBuckets.get(key)!;
            b.gmv += snap.gmv; b.revenue += snap.platformNetRevenue; b.orders += snap.totalOrders;
            b.newUsers += snap.newUsers; b.days++; b.cancelledOrders += snap.cancelledOrders;
            b.activeUsers = Math.max(b.activeUsers, snap.activeUsers);
            b.heroUtilization += snap.heroUtilizationRate;
            b.margin += snap.contributionMargin;
        }

        const monthlyData = Array.from(monthlyBuckets.values()).map(b => ({
            month: b.month,
            gmv: Math.round(b.gmv),
            revenue: Math.round(b.revenue),
            totalOrders: b.orders,
            activeUsers: b.activeUsers,
            newUsers: b.newUsers,
            cancellationRate: b.orders > 0 ? Math.round((b.cancelledOrders / b.orders) * 10000) / 100 : 0,
            heroUtilization: b.days > 0 ? Math.round((b.heroUtilization / b.days) * 100) / 100 : 0,
            avgMarginPerOrder: b.orders > 0 ? Math.round((b.margin / b.days) * 100) / 100 : 0,
            orderGrowthRate: 0, // calculated below
        }));

        // Calculate month-over-month growth
        for (let i = 1; i < monthlyData.length; i++) {
            const prev = monthlyData[i - 1].totalOrders;
            const curr = monthlyData[i].totalOrders;
            monthlyData[i].orderGrowthRate = prev > 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : 0;
        }

        const retention = await getRetentionStats();
        const growth = await getGrowthTrend(30);

        const totalUsers = await User.countDocuments();
        const totalHeroes = await User.countDocuments({ role: 'hero' });

        // Summary metrics
        const latestMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;
        const summary = {
            totalGMV: monthlyData.reduce((s, m) => s + m.gmv, 0),
            totalRevenue: monthlyData.reduce((s, m) => s + m.revenue, 0),
            totalOrders: monthlyData.reduce((s, m) => s + m.totalOrders, 0),
            totalUsers,
            totalHeroes,
            activeUsers: latestMonth?.activeUsers || 0,
            retention7d: retention.retention7d,
            retention30d: retention.retention30d,
            latestMonthGMV: latestMonth?.gmv || 0,
            latestMonthRevenue: latestMonth?.revenue || 0,
            heroRetention: latestMonth?.heroUtilization || 0,
            marginPerOrder: latestMonth?.avgMarginPerOrder || 0,
            churnRate: retention.churnRate,
        };

        if (format === 'csv') {
            const csvHeaders = 'Month,GMV,Revenue,Orders,Active Users,New Users,Cancellation Rate,Hero Utilization,Margin/Order,Growth Rate\n';
            const csvRows = monthlyData.map(m =>
                `${m.month},${m.gmv},${m.revenue},${m.totalOrders},${m.activeUsers},${m.newUsers},${m.cancellationRate}%,${m.heroUtilization}%,₹${m.avgMarginPerOrder},${m.orderGrowthRate}%`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=marketx_investor_metrics.csv');
            res.send(csvHeaders + csvRows);
            return;
        }

        res.json({ summary, monthlyData, retention, growth });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to generate investor metrics' });
    }
};
