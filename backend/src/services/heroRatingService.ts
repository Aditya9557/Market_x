import HeroRating from '../models/HeroRating';
import DeliveryDriver from '../models/DeliveryDriver';
import Delivery from '../models/Delivery';
import logger from '../config/logger';

/**
 * Hero Rating & Discipline Service.
 * 
 * Rules:
 * - reliabilityScore computed from: avg rating, cancellation rate, delivery count
 * - Thresholds:
 *   - score < 3.0 → warning
 *   - score < 2.0 → suspended
 *   - 3+ cancellations in 7 days → warning
 *   - 5+ cancellations in 7 days → suspended
 */

const WARN_SCORE = 3.0;
const SUSPEND_SCORE = 2.0;
const WARN_CANCELLATIONS_7D = 3;
const SUSPEND_CANCELLATIONS_7D = 5;

export interface HeroReliabilityReport {
    avgRating: number;
    totalRatings: number;
    totalDeliveries: number;
    cancellationsLast7d: number;
    reliabilityScore: number;
    status: 'active' | 'warning' | 'suspended';
    warnings: string[];
}

/**
 * Rate a hero for a delivery.
 */
export const rateHero = async (params: {
    deliveryId: string;
    orderId: string;
    heroId: string;
    ratedBy: string;
    rating: number;
    comment?: string;
}): Promise<any> => {
    // Verify delivery exists and is delivered
    const delivery = await Delivery.findById(params.deliveryId);
    if (!delivery) throw new Error('Delivery not found');
    if (delivery.status !== 'delivered') throw new Error('Can only rate completed deliveries');
    if (delivery.customer.toString() !== params.ratedBy) {
        throw new Error('Only the customer can rate this delivery');
    }

    const rating = await HeroRating.create({
        delivery: params.deliveryId,
        order: params.orderId,
        hero: params.heroId,
        ratedBy: params.ratedBy,
        rating: params.rating,
        comment: params.comment,
    });

    // Recalculate and update aggregate score
    await recalculateHeroScore(params.heroId);

    logger.info(`Hero ${params.heroId} rated ${params.rating}/5 for delivery ${params.deliveryId}`);

    return rating;
};

/**
 * Recalculate hero's aggregate rating and determine discipline status.
 */
export const recalculateHeroScore = async (heroId: string): Promise<HeroReliabilityReport> => {
    // Aggregate ratings
    const ratingAgg = await HeroRating.aggregate([
        { $match: { hero: heroId } },
        {
            $group: {
                _id: null,
                avgRating: { $avg: '$rating' },
                count: { $sum: 1 },
            },
        },
    ]);

    const avgRating = ratingAgg.length > 0 ? ratingAgg[0].avgRating : 5.0;
    const totalRatings = ratingAgg.length > 0 ? ratingAgg[0].count : 0;

    // Count cancellations in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const cancellationsLast7d = await Delivery.countDocuments({
        driver: heroId,
        status: 'cancelled',
        updatedAt: { $gte: sevenDaysAgo },
    });

    const driver = await DeliveryDriver.findOne({ user: heroId });
    const totalDeliveries = driver?.totalDeliveries || 0;

    // Compute reliability score (weighted: 70% rating + 30% cancellation penalty)
    const cancellationPenalty = Math.min(cancellationsLast7d * 0.5, 2.5);
    const reliabilityScore = Math.max(0, Math.min(5, avgRating - cancellationPenalty));

    // Determine status
    const warnings: string[] = [];
    let status: 'active' | 'warning' | 'suspended' = 'active';

    if (reliabilityScore < SUSPEND_SCORE || cancellationsLast7d >= SUSPEND_CANCELLATIONS_7D) {
        status = 'suspended';
        warnings.push(`Account suspended: reliability score ${reliabilityScore.toFixed(1)}, ${cancellationsLast7d} cancellations in 7 days`);
    } else if (reliabilityScore < WARN_SCORE || cancellationsLast7d >= WARN_CANCELLATIONS_7D) {
        status = 'warning';
        warnings.push(`Warning: reliability score ${reliabilityScore.toFixed(1)}, ${cancellationsLast7d} cancellations in 7 days`);
    }

    // Update driver profile
    if (driver) {
        driver.rating = parseFloat(avgRating.toFixed(2));
        driver.ratingCount = totalRatings;
        await driver.save();
    }

    // If suspended, take driver offline
    if (status === 'suspended' && driver) {
        driver.isOnline = false;
        driver.isAvailable = false;
        await driver.save();
        logger.warn(`Hero ${heroId} has been auto-suspended: score=${reliabilityScore.toFixed(1)}, cancellations=${cancellationsLast7d}`);
    }

    return {
        avgRating: parseFloat(avgRating.toFixed(2)),
        totalRatings,
        totalDeliveries,
        cancellationsLast7d,
        reliabilityScore: parseFloat(reliabilityScore.toFixed(2)),
        status,
        warnings,
    };
};

/**
 * Get hero ratings for display.
 */
export const getHeroRatings = async (heroId: string, page = 1, limit = 20) => {
    const ratings = await HeroRating.find({ hero: heroId })
        .populate('ratedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await HeroRating.countDocuments({ hero: heroId });

    return { ratings, total, page, pages: Math.ceil(total / limit) };
};
