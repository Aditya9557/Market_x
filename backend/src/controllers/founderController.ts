import { Request, Response } from 'express';
import { getSnapshots, getGrowthTrend, computeDailySnapshot } from '../services/founderAnalyticsService';
import { getRetentionStats } from '../services/retentionService';

/**
 * @route   GET /api/admin/analytics/dashboard
 * @desc    Admin analytics dashboard — snapshots + growth + retention
 */
export const getAdminAnalyticsDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const campusId = (req.query.campusId as string) || 'all';

        const [snapshots, growth7d, growth30d, retention] = await Promise.all([
            getSnapshots(days, campusId),
            getGrowthTrend(7, campusId),
            getGrowthTrend(30, campusId),
            getRetentionStats(),
        ]);

        const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

        const heatmap = snapshots.map((s: any) => ({
            date: s.date,
            peakHourOrders: s.peakHourOrders,
            peakHourPct: s.peakHourPct,
            totalOrders: s.totalOrders,
        }));

        const heroPerformance = latest ? {
            totalHeroes: latest.totalHeroes,
            activeHeroes: latest.activeHeroes,
            utilizationRate: latest.heroUtilizationRate,
            avgEarning: latest.avgHeroEarning,
        } : null;

        res.json({
            snapshots,
            growth: { week: growth7d, month: growth30d },
            retention,
            revenueBreakdown: latest ? {
                delivery: latest.deliveryRevenue,
                commission: latest.commissionRevenue,
                total: latest.platformNetRevenue,
            } : null,
            heatmap,
            heroPerformance,
            latestSnapshot: latest,
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to load admin dashboard' });
    }
};

/**
 * @route   POST /api/admin/analytics/snapshot
 * @desc    Manually trigger a snapshot computation
 */
export const triggerSnapshot = async (_req: Request, res: Response): Promise<void> => {
    try {
        const snapshot = await computeDailySnapshot();
        res.json({ message: 'Snapshot computed', snapshot });
    } catch (err: any) {
        res.status(500).json({ message: 'Snapshot failed' });
    }
};
