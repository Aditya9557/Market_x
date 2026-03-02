import mongoose from 'mongoose';
import HeroIncentive from '../models/HeroIncentive';
import Delivery from '../models/Delivery';
import HeroRating from '../models/HeroRating';
import Order from '../models/Order';
import DeliveryDriver from '../models/DeliveryDriver';
import { createLedgerEntry } from './walletService';
import logger from '../config/logger';

/**
 * HeroIncentiveService — calculates and credits weekly bonuses,
 * streak rewards, peak-hour multipliers, and cancellation penalties.
 *
 * Multiplier tiers:
 *   Reliability multiplier: 1.0x – 1.3x (based on reliability score)
 *   Peak hour multiplier: 1.0x – 1.2x (based on peak hour deliveries)
 *   Rating multiplier: 1.0x – 1.25x (based on average rating)
 */

interface IncentiveCalculation {
    weeklyBonus: number;
    streakReward: number;
    peakBonus: number;
    ratingBonus: number;
    cancellationPenalty: number;
    totalIncentive: number;
    reliabilityMultiplier: number;
    peakMultiplier: number;
    ratingMultiplier: number;
    performanceSnapshot: any;
}

/**
 * Calculate weekly incentives for a hero.
 */
export const calculateWeeklyIncentives = async (heroUserId: string): Promise<IncentiveCalculation> => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const driver = await DeliveryDriver.findOne({ user: heroUserId }).lean();

    // ── Deliveries this week ────────────────────────────────────
    const weekDeliveries = await Delivery.countDocuments({
        hero: heroUserId,
        status: 'delivered',
        updatedAt: { $gte: weekStart },
    });

    // ── Acceptance streak (consecutive accepts without cancellation) ──
    const recentDeliveries = await Delivery.find({
        hero: heroUserId,
        updatedAt: { $gte: weekStart },
    }).sort({ updatedAt: -1 }).lean();

    let acceptanceStreak = 0;
    for (const d of recentDeliveries) {
        if ((d as any).status === 'delivered') acceptanceStreak++;
        else break;
    }

    // ── Average rating ──────────────────────────────────────────
    const ratingAgg = await HeroRating.aggregate([
        { $match: { hero: new mongoose.Types.ObjectId(heroUserId) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avgRating = ratingAgg[0]?.avg || 5.0;

    // ── Cancellation % ──────────────────────────────────────────
    const [totalAccepted, totalCancelled] = await Promise.all([
        Delivery.countDocuments({ hero: heroUserId, updatedAt: { $gte: weekStart } }),
        Delivery.countDocuments({ hero: heroUserId, status: 'cancelled', updatedAt: { $gte: weekStart } }),
    ]);
    const cancellationPct = totalAccepted > 0 ? (totalCancelled / totalAccepted) * 100 : 0;

    // ── Peak hour deliveries (7-10 PM IST) ──────────────────────
    const peakDeliveries = await Delivery.countDocuments({
        hero: heroUserId,
        status: 'delivered',
        updatedAt: { $gte: weekStart },
        // Approximate peak: these would need time-of-day queries
    });
    // Estimate peak: ~35% of deliveries during peak hours
    const peakHourDeliveries = Math.round(peakDeliveries * 0.35);

    const reliabilityScore = (driver as any)?.reliabilityScore || 5.0;

    // ── Calculate Multipliers ───────────────────────────────────
    const reliabilityMultiplier = reliabilityScore >= 4.5 ? 1.3
        : reliabilityScore >= 4.0 ? 1.2
            : reliabilityScore >= 3.0 ? 1.1
                : 1.0;

    const peakMultiplier = peakHourDeliveries >= 10 ? 1.2
        : peakHourDeliveries >= 5 ? 1.1
            : 1.0;

    const ratingMultiplier = avgRating >= 4.8 ? 1.25
        : avgRating >= 4.5 ? 1.15
            : avgRating >= 4.0 ? 1.05
                : 1.0;

    // ── Calculate Bonuses ───────────────────────────────────────
    // Weekly bonus: ₹10 per delivery × reliability multiplier
    const weeklyBonus = Math.round(weekDeliveries * 10 * reliabilityMultiplier);

    // Streak reward: ₹50 bonus per 10 consecutive deliveries
    const streakReward = Math.floor(acceptanceStreak / 10) * 50;

    // Peak bonus: ₹15 per peak-hour delivery
    const peakBonus = Math.round(peakHourDeliveries * 15 * peakMultiplier);

    // Rating bonus: based on maintaining high rating
    const ratingBonus = avgRating >= 4.5 && weekDeliveries >= 5
        ? Math.round(50 * ratingMultiplier)
        : 0;

    // Cancellation penalty: -₹20 per cancellation if > 10%
    const cancellationPenalty = cancellationPct > 10
        ? Math.round(totalCancelled * 20)
        : 0;

    const totalIncentive = weeklyBonus + streakReward + peakBonus + ratingBonus - cancellationPenalty;

    const performanceSnapshot = {
        deliveriesCompleted: weekDeliveries,
        acceptanceStreak,
        avgRating: parseFloat(avgRating.toFixed(2)),
        cancellationPct: parseFloat(cancellationPct.toFixed(1)),
        peakHourDeliveries,
        reliabilityScore,
    };

    return {
        weeklyBonus,
        streakReward,
        peakBonus,
        ratingBonus,
        cancellationPenalty,
        totalIncentive,
        reliabilityMultiplier,
        peakMultiplier,
        ratingMultiplier,
        performanceSnapshot,
    };
};

/**
 * Process and credit weekly incentives for a hero.
 */
export const creditWeeklyIncentives = async (heroUserId: string): Promise<void> => {
    const calc = await calculateWeeklyIncentives(heroUserId);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    if (calc.totalIncentive <= 0) {
        logger.info(`Hero ${heroUserId}: no incentives to credit this week`);
        return;
    }

    // Check if already credited this week
    const existing = await HeroIncentive.findOne({
        heroId: heroUserId,
        type: 'weekly_bonus',
        periodStart: { $gte: weekStart },
    });
    if (existing) {
        logger.info(`Hero ${heroUserId}: weekly incentive already processed`);
        return;
    }

    // Create incentive records
    const incentiveEntries = [];

    if (calc.weeklyBonus > 0) {
        incentiveEntries.push({
            heroId: heroUserId,
            type: 'weekly_bonus' as const,
            amount: calc.weeklyBonus,
            multiplier: calc.reliabilityMultiplier,
            periodStart: weekStart,
            periodEnd: now,
            status: 'credited' as const,
            performanceSnapshot: calc.performanceSnapshot,
            creditedAt: now,
        });
    }

    if (calc.streakReward > 0) {
        incentiveEntries.push({
            heroId: heroUserId,
            type: 'streak_reward' as const,
            amount: calc.streakReward,
            multiplier: 1.0,
            periodStart: weekStart,
            periodEnd: now,
            status: 'credited' as const,
            performanceSnapshot: calc.performanceSnapshot,
            creditedAt: now,
        });
    }

    if (calc.peakBonus > 0) {
        incentiveEntries.push({
            heroId: heroUserId,
            type: 'peak_bonus' as const,
            amount: calc.peakBonus,
            multiplier: calc.peakMultiplier,
            periodStart: weekStart,
            periodEnd: now,
            status: 'credited' as const,
            performanceSnapshot: calc.performanceSnapshot,
            creditedAt: now,
        });
    }

    if (calc.cancellationPenalty > 0) {
        incentiveEntries.push({
            heroId: heroUserId,
            type: 'cancellation_penalty' as const,
            amount: -calc.cancellationPenalty,
            multiplier: 1.0,
            periodStart: weekStart,
            periodEnd: now,
            status: 'credited' as const,
            performanceSnapshot: calc.performanceSnapshot,
            creditedAt: now,
        });
    }

    await HeroIncentive.insertMany(incentiveEntries);

    // Credit net amount to wallet
    await createLedgerEntry({
        userId: heroUserId,
        type: 'credit',
        amount: calc.totalIncentive,
        category: 'delivery_earning',
        reference: `Weekly performance incentive — ₹${calc.totalIncentive}`,
    });

    logger.info(`Hero ${heroUserId}: credited ₹${calc.totalIncentive} weekly incentive`, calc.performanceSnapshot);
};

/**
 * Get hero earnings forecast for the earnings panel.
 */
export const getHeroEarningsForecast = async (heroUserId: string) => {
    const calc = await calculateWeeklyIncentives(heroUserId);

    // Project monthly: current weekly × 4
    const monthlyProjection = calc.totalIncentive * 4;

    // Get past 4 weeks of incentives
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const pastIncentives = await HeroIncentive.find({
        heroId: heroUserId,
        status: 'credited',
        periodStart: { $gte: fourWeeksAgo },
    }).sort({ periodStart: -1 }).lean();

    const totalPastEarned = pastIncentives.reduce((sum, i) => sum + (i.amount > 0 ? i.amount : 0), 0);

    return {
        currentWeek: calc,
        monthlyProjection,
        totalPastEarned,
        pastIncentives,
        earningsRange: {
            min: Math.round(monthlyProjection * 0.8),
            max: Math.round(monthlyProjection * 1.3),
        },
    };
};
