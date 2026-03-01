import bcrypt from 'bcryptjs';
import Order from '../models/Order';
import { getRedis } from '../config/redis';
import { getIO } from '../socket/socketServer';
import logger from '../config/logger';

/**
 * Phase-1 Hero Service
 * Handles: OTP generation/verification, Redis location cache, Haversine ETA, zone broadcasts
 */

// ────────────────────────────────────────────────────
// SECTION 1: OTP
// ────────────────────────────────────────────────────

/**
 * Generate a 4-digit OTP, hash it, and store on the Order.
 * Returns the PLAIN OTP (to be sent to student via WebSocket).
 * OTP expires in 10 minutes.
 */
export const generateAndStoreOtp = async (orderId: string): Promise<string> => {
    const plain = Math.floor(1000 + Math.random() * 9000).toString(); // "1234"–"9999"
    const hash = await bcrypt.hash(plain, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // +10 min

    await Order.findByIdAndUpdate(orderId, {
        deliveryOtpHash: hash,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
        otpVerified: false,
        otpLocked: false,
    });

    logger.info(`OTP generated for order ${orderId} — expires at ${expiresAt.toISOString()}`);
    return plain;
};

/**
 * Verify OTP submitted by hero on behalf of student.
 * Returns { success, locked, remainingAttempts, error? }
 */
export const verifyOtp = async (
    orderId: string,
    attempt: string
): Promise<{ success: boolean; locked: boolean; remainingAttempts: number; error?: string }> => {
    const order = await Order.findById(orderId).select(
        'deliveryOtpHash otpExpiresAt otpAttempts otpVerified otpLocked'
    );

    if (!order) return { success: false, locked: false, remainingAttempts: 0, error: 'Order not found' };

    if (order.otpLocked) {
        return { success: false, locked: true, remainingAttempts: 0, error: 'OTP locked — contact admin' };
    }

    if (order.otpVerified) {
        return { success: true, locked: false, remainingAttempts: 3 };
    }

    if (!order.deliveryOtpHash || !order.otpExpiresAt) {
        return { success: false, locked: false, remainingAttempts: 0, error: 'No OTP generated — mark picked_up first' };
    }

    if (new Date() > order.otpExpiresAt) {
        return { success: false, locked: false, remainingAttempts: 0, error: 'OTP expired. Request admin to reset.' };
    }

    const isMatch = await bcrypt.compare(attempt, order.deliveryOtpHash);
    const newAttempts = order.otpAttempts + 1;
    const remainingAttempts = Math.max(0, 3 - newAttempts);

    if (isMatch) {
        await Order.findByIdAndUpdate(orderId, { otpVerified: true, otpAttempts: newAttempts });
        logger.info(`OTP verified for order ${orderId}`);
        return { success: true, locked: false, remainingAttempts };
    }

    const shouldLock = newAttempts >= 3;
    await Order.findByIdAndUpdate(orderId, {
        otpAttempts: newAttempts,
        ...(shouldLock ? { otpLocked: true } : {}),
    });

    if (shouldLock) {
        logger.warn(`OTP locked for order ${orderId} after 3 failed attempts`);
    }

    return {
        success: false,
        locked: shouldLock,
        remainingAttempts,
        error: shouldLock ? 'Too many wrong attempts. Order locked — contact admin.' : `Wrong OTP. ${remainingAttempts} attempt(s) left.`,
    };
};

// ────────────────────────────────────────────────────
// SECTION 2: REDIS LOCATION CACHE (during delivery only)
// ────────────────────────────────────────────────────

const LOCATION_KEY = (heroId: string) => `hero:location:${heroId}`;
const THROTTLE_KEY = (heroId: string) => `location-throttle:${heroId}`;

/**
 * Cache hero's latest location in Redis. TTL = 60s.
 * Does NOT write to MongoDB — keeping DB clean per Phase-1 rules.
 * Returns false if throttled (8s window).
 */
export const cacheHeroLocation = async (
    heroId: string,
    lat: number,
    lng: number
): Promise<boolean> => {
    try {
        const r = getRedis();

        // 8-second throttle — skip if emitted too recently
        const throttled = await r.set(THROTTLE_KEY(heroId), '1', 'EX', 8, 'NX');
        if (!throttled) return false; // was already set — throttled

        await r.set(
            LOCATION_KEY(heroId),
            JSON.stringify({ lat, lng, lastUpdatedAt: new Date().toISOString() }),
            'EX', 60
        );
        return true;
    } catch {
        return false;
    }
};

/**
 * Get hero's last-known location from Redis cache.
 * Returns null if not found or expired.
 */
export const getHeroLocationFromCache = async (
    heroId: string
): Promise<{ lat: number; lng: number; lastUpdatedAt: string } | null> => {
    try {
        const r = getRedis();
        const raw = await r.get(LOCATION_KEY(heroId));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

/**
 * Remove hero location from Redis (when delivery completes or hero goes offline).
 */
export const clearHeroLocation = async (heroId: string): Promise<void> => {
    try {
        const r = getRedis();
        await r.del(LOCATION_KEY(heroId));
    } catch { /* noop */ }
};

// ────────────────────────────────────────────────────
// SECTION 3: HAVERSINE ETA
// ────────────────────────────────────────────────────

const CAMPUS_SPEED_KMH = 15;
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate straight-line distance (km) and ETA (minutes) using Haversine.
 * Uses 15km/h campus average speed.
 */
export const haversineEta = (
    lat1: number, lng1: number,
    lat2: number, lng2: number
): { distanceKm: number; etaMinutes: number } => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const distanceKm = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
    const etaMinutes = Math.ceil((distanceKm / CAMPUS_SPEED_KMH) * 60);
    return { distanceKm: parseFloat(distanceKm.toFixed(2)), etaMinutes: Math.max(1, etaMinutes) };
};

// ────────────────────────────────────────────────────
// SECTION 4: ZONE BROADCAST
// ────────────────────────────────────────────────────

/**
 * Broadcast a new order to all heroes in the specified zone.
 * Heroes must have joined `zone:{zone}` Socket.io room (done on toggleOnline).
 */
export const broadcastNewOrderToZone = (zone: string, orderData: object): void => {
    try {
        const io = getIO();
        io.to(`zone:${zone}`).emit('order:new', {
            ...orderData,
            timestamp: new Date().toISOString(),
        });
        logger.info(`Broadcast order:new to zone:${zone}`);
    } catch (err) {
        logger.warn('Socket not ready for zone broadcast:', err);
    }
};
