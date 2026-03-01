import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User, { IUser } from '../models/User';
import Store from '../models/Store';
import RefreshToken from '../models/RefreshToken';
import logger from '../config/logger';

const ACCESS_TOKEN_EXPIRY = '15m';       // short-lived
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// Read JWT_SECRET at runtime (not module-load time) to ensure dotenv has loaded
const getJwtSecret = () => process.env.JWT_SECRET || 'secret';

/**
 * Generate a short-lived access token.
 */
export const generateAccessToken = (userId: string): string => {
    return jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
};

/**
 * Generate a refresh token, persist it, and return the token string.
 * Implements rotation: each refresh generates a new pair and old one is revoked.
 */
export const generateRefreshToken = async (
    userId: string,
    userAgent?: string,
    ipAddress?: string,
): Promise<string> => {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
        user: userId,
        token,
        expiresAt,
        userAgent,
        ipAddress,
    });

    return token;
};

/**
 * Refresh: verify refresh token, rotate (revoke old + issue new pair).
 * Returns new access + refresh tokens.
 */
export const refreshAccessToken = async (
    refreshTokenStr: string,
    userAgent?: string,
    ipAddress?: string,
): Promise<{ accessToken: string; refreshToken: string; user: any }> => {
    const tokenDoc = await RefreshToken.findOne({ token: refreshTokenStr });

    if (!tokenDoc) {
        throw new Error('Invalid refresh token');
    }

    if (tokenDoc.revoked) {
        // Possible token reuse attack — revoke all tokens for this user
        logger.warn(`Refresh token reuse detected for user ${tokenDoc.user}. Revoking all sessions.`);
        await RefreshToken.updateMany(
            { user: tokenDoc.user },
            { $set: { revoked: true, revokedAt: new Date() } },
        );
        throw new Error('Refresh token reused — all sessions revoked for security');
    }

    if (tokenDoc.expiresAt < new Date()) {
        throw new Error('Refresh token expired');
    }

    // Revoke old token
    tokenDoc.revoked = true;
    tokenDoc.revokedAt = new Date();

    const user = await User.findById(tokenDoc.user).select('-password');
    if (!user) throw new Error('User not found');

    // Issue new pair
    const newAccessToken = generateAccessToken(user._id as unknown as string);
    const newRefreshToken = await generateRefreshToken(
        user._id as unknown as string,
        userAgent,
        ipAddress,
    );

    tokenDoc.replacedByToken = newRefreshToken;
    await tokenDoc.save();

    // Get store info for shopkeepers
    let storeData = null;
    if (user.role === 'shopkeeper' && user.store) {
        const store = await Store.findById(user.store).select('_id name status');
        if (store) storeData = { _id: store._id, name: store.name, status: store.status };
    }

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            store: storeData,
        },
    };
};

/**
 * Logout: revoke a specific refresh token.
 */
export const revokeRefreshToken = async (refreshTokenStr: string): Promise<void> => {
    const tokenDoc = await RefreshToken.findOne({ token: refreshTokenStr });
    if (tokenDoc && !tokenDoc.revoked) {
        tokenDoc.revoked = true;
        tokenDoc.revokedAt = new Date();
        await tokenDoc.save();
    }
};

/**
 * Revoke all sessions for a user (e.g., password change, security event).
 */
export const revokeAllUserSessions = async (userId: string): Promise<number> => {
    const result = await RefreshToken.updateMany(
        { user: userId, revoked: false },
        { $set: { revoked: true, revokedAt: new Date() } },
    );
    return result.modifiedCount;
};
