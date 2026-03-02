import CampusConfig from '../models/CampusConfig';
import Order from '../models/Order';
import Delivery from '../models/Delivery';
import User from '../models/User';
import logger from '../config/logger';
import { getRedis } from '../config/redis';

/**
 * DynamicPricingService — adjusts delivery fees & hero incentives based on real-time conditions.
 *
 * Surge triggers:
 *   - Peak hours (7–10 PM)
 *   - High hero load (orders > heroes × 8)
 *   - High demand velocity (> 20 orders/hour)
 *   - Rain mode (manual admin toggle via Redis)
 *
 * Maintains a platform margin floor, configurable per campus.
 */

interface PricingResult {
    baseDeliveryFee: number;
    surgeMultiplier: number;
    finalDeliveryFee: number;
    heroIncentiveBoost: number;         // extra ₹ paid to hero
    platformMargin: number;             // ₹ platform keeps
    surgeReasons: string[];
    isInSurge: boolean;
}

const MARGIN_FLOOR_PCT = 20;            // minimum platform margin %
const BASE_FEE = 30;                    // ₹30 default
const MAX_SURGE = 1.5;                  // max 50% surge cap

export const calculateDynamicPrice = async (campusId = 'campus_main'): Promise<PricingResult> => {
    const surgeReasons: string[] = [];
    let surgeMultiplier = 1.0;

    // Load campus config override
    const campusConfig = await CampusConfig.findOne({ campusId }).lean();
    const baseFee = campusConfig?.baseFee || BASE_FEE;

    // ── Check peak hours (7–10 PM IST) ─────────────────────────
    const now = new Date();
    const istHour = (now.getUTCHours() + 5.5) % 24; // IST offset
    const isPeakHour = istHour >= 19 && istHour < 22;
    if (isPeakHour) {
        surgeMultiplier += 0.10; // +10%
        surgeReasons.push('Peak hour (7-10 PM)');
    }

    // ── Check hero load ────────────────────────────────────────
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const [recentOrders, availableHeroes] = await Promise.all([
        Order.countDocuments({
            type: 'child',
            orderType: 'delivery',
            status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'ready_for_pickup', 'hero_assigned'] },
            createdAt: { $gte: oneHourAgo },
        }),
        User.countDocuments({ role: 'hero', status: 'active', isHeroMode: true }),
    ]);

    const heroLoadRatio = availableHeroes > 0 ? recentOrders / availableHeroes : recentOrders;
    if (heroLoadRatio > 8) {
        surgeMultiplier += 0.15; // +15% high hero load
        surgeReasons.push(`High hero load (${recentOrders} orders / ${availableHeroes} heroes)`);
    } else if (heroLoadRatio > 5) {
        surgeMultiplier += 0.08; // +8% moderate load
        surgeReasons.push(`Moderate hero load (ratio ${heroLoadRatio.toFixed(1)})`);
    }

    // ── Check demand velocity ──────────────────────────────────
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const velocityOrders = await Order.countDocuments({
        type: 'parent',
        createdAt: { $gte: thirtyMinAgo },
    });
    if (velocityOrders > 10) { // > 20/hour rate
        surgeMultiplier += 0.10;
        surgeReasons.push(`High demand velocity (${velocityOrders * 2}/hr)`);
    }

    // ── Check rain mode (admin toggle) ─────────────────────────
    try {
        const redis = getRedis();
        const rainMode = await redis.get(`surge:rain:${campusId}`);
        if (rainMode === '1') {
            surgeMultiplier += 0.12; // +12% rain premium
            surgeReasons.push('Rain mode active');
        }
    } catch { /* Redis down — skip */ }

    // ── Cap surge ──────────────────────────────────────────────
    surgeMultiplier = Math.min(surgeMultiplier, MAX_SURGE);

    const finalDeliveryFee = Math.round(baseFee * surgeMultiplier);
    const heroCommissionPct = (campusConfig?.heroCommission || 70) / 100;
    const heroIncentiveBoost = surgeMultiplier > 1 ? Math.round((finalDeliveryFee - baseFee) * 0.6) : 0;
    const platformMargin = finalDeliveryFee - Math.round(finalDeliveryFee * heroCommissionPct) - heroIncentiveBoost;

    return {
        baseDeliveryFee: baseFee,
        surgeMultiplier: Math.round(surgeMultiplier * 100) / 100,
        finalDeliveryFee,
        heroIncentiveBoost,
        platformMargin: Math.max(platformMargin, Math.round(finalDeliveryFee * MARGIN_FLOOR_PCT / 100)),
        surgeReasons,
        isInSurge: surgeMultiplier > 1.0,
    };
};

/**
 * Toggle rain mode for a campus.
 */
export const toggleRainMode = async (campusId: string, enabled: boolean): Promise<void> => {
    try {
        const redis = getRedis();
        if (enabled) {
            await redis.set(`surge:rain:${campusId}`, '1', 'EX', 6 * 3600); // auto-expires in 6 hours
        } else {
            await redis.del(`surge:rain:${campusId}`);
        }
        logger.info(`Rain mode ${enabled ? 'ON' : 'OFF'} for campus ${campusId}`);
    } catch (err: any) {
        logger.error('toggleRainMode error', { error: err.message });
    }
};

/**
 * Get current surge status for display.
 */
export const getSurgeStatus = async (campusId = 'campus_main') => {
    const pricing = await calculateDynamicPrice(campusId);
    return {
        ...pricing,
        timestamp: new Date(),
        campusId,
    };
};
