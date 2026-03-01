import bcrypt from 'bcryptjs';
import { db } from '../config/firebase';

/**
 * Phase-1 Hero Service — Firestore-based
 * Handles: OTP generation/verification, location tracking, Haversine ETA
 */

// ── OTP ─────────────────────────────────────────────

export const generateAndStoreOtp = async (orderId: string): Promise<string> => {
    const plain = Math.floor(1000 + Math.random() * 9000).toString();
    const hash = await bcrypt.hash(plain, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.collection('orders').doc(orderId).update({
        deliveryOtpHash: hash,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
        otpVerified: false,
        otpLocked: false,
    });

    console.log(`OTP generated for order ${orderId} — expires at ${expiresAt.toISOString()}`);
    return plain;
};

export const verifyOtp = async (
    orderId: string,
    attempt: string
): Promise<{ success: boolean; locked: boolean; remainingAttempts: number; error?: string }> => {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) return { success: false, locked: false, remainingAttempts: 0, error: 'Order not found' };

    const order = orderDoc.data()!;

    if (order.otpLocked) {
        return { success: false, locked: true, remainingAttempts: 0, error: 'OTP locked — contact admin' };
    }
    if (order.otpVerified) {
        return { success: true, locked: false, remainingAttempts: 3 };
    }
    if (!order.deliveryOtpHash || !order.otpExpiresAt) {
        return { success: false, locked: false, remainingAttempts: 0, error: 'No OTP generated — mark picked_up first' };
    }

    const expiresAt = order.otpExpiresAt.toDate ? order.otpExpiresAt.toDate() : new Date(order.otpExpiresAt);
    if (new Date() > expiresAt) {
        return { success: false, locked: false, remainingAttempts: 0, error: 'OTP expired. Request admin to reset.' };
    }

    const isMatch = await bcrypt.compare(attempt, order.deliveryOtpHash);
    const newAttempts = (order.otpAttempts || 0) + 1;
    const remainingAttempts = Math.max(0, 3 - newAttempts);

    if (isMatch) {
        await db.collection('orders').doc(orderId).update({ otpVerified: true, otpAttempts: newAttempts });
        return { success: true, locked: false, remainingAttempts };
    }

    const shouldLock = newAttempts >= 3;
    const update: any = { otpAttempts: newAttempts };
    if (shouldLock) update.otpLocked = true;
    await db.collection('orders').doc(orderId).update(update);

    return {
        success: false,
        locked: shouldLock,
        remainingAttempts,
        error: shouldLock ? 'Too many wrong attempts. Order locked — contact admin.' : `Wrong OTP. ${remainingAttempts} attempt(s) left.`,
    };
};

// ── LOCATION (Firestore instead of Redis) ───────────

// In serverless, we use Firestore for location caching since there's no persistent Redis
// Throttle is implemented with a simple timestamp check

export const updateDriverLocationInFirestore = async (
    heroId: string,
    lat: number,
    lng: number
): Promise<boolean> => {
    try {
        const locRef = db.collection('driverLocations').doc(heroId);
        const locDoc = await locRef.get();

        // Throttle: 5s minimum between updates
        if (locDoc.exists) {
            const lastUpdate = locDoc.data()!.lastUpdatedAt;
            const lastTime = lastUpdate?.toDate ? lastUpdate.toDate() : new Date(lastUpdate);
            if (Date.now() - lastTime.getTime() < 5000) return false;
        }

        await locRef.set({
            heroId,
            lat,
            lng,
            lastUpdatedAt: new Date(),
        }, { merge: true });

        return true;
    } catch {
        return false;
    }
};

export const getHeroLocationFromFirestore = async (
    heroId: string
): Promise<{ lat: number; lng: number; lastUpdatedAt: string } | null> => {
    try {
        const doc = await db.collection('driverLocations').doc(heroId).get();
        if (!doc.exists) return null;
        const data = doc.data()!;
        return {
            lat: data.lat,
            lng: data.lng,
            lastUpdatedAt: data.lastUpdatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        };
    } catch {
        return null;
    }
};

export const clearHeroLocation = async (heroId: string): Promise<void> => {
    try {
        await db.collection('driverLocations').doc(heroId).delete();
    } catch { /* noop */ }
};

// ── HAVERSINE ETA ───────────────────────────────────

const CAMPUS_SPEED_KMH = 15;
const EARTH_RADIUS_KM = 6371;

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
