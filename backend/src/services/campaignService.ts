import mongoose from 'mongoose';
import Referral from '../models/Referral';
import Campaign, { ICampaign } from '../models/Campaign';
import Order from '../models/Order';
import User from '../models/User';
import { createLedgerEntry } from './walletService';
import logger from '../config/logger';

// ─── REFERRAL SYSTEM ────────────────────────────────────────────────────────

/**
 * Generate a unique referral code for a user (based on user ID).
 */
export const generateReferralCode = (userId: string): string => {
    const hash = userId.slice(-6).toUpperCase();
    return `MX-${hash}`;
};

/**
 * Register a referral tracking entry when a new user signs up with a referral code.
 * Anti-fraud: blocks self-referrals via same IP detection.
 */
export const registerReferral = async (
    referralCode: string,
    referredUserId: string,
    ipReferred?: string
): Promise<{ success: boolean; message: string }> => {
    try {
        // Find referrer
        const allUsers = await User.find().select('_id').lean();
        let referrerId: string | null = null;

        for (const u of allUsers) {
            if (generateReferralCode(u._id.toString()) === referralCode.toUpperCase()) {
                referrerId = u._id.toString();
                break;
            }
        }

        if (!referrerId) return { success: false, message: 'Invalid referral code' };
        if (referrerId === referredUserId) return { success: false, message: 'Cannot refer yourself' };

        // Check existing referral
        const existing = await Referral.findOne({ referredUserId });
        if (existing) return { success: false, message: 'User already referred' };

        // IP-based self-referral check
        if (ipReferred) {
            const referrerReferrals = await Referral.find({ referrerId, ipReferred: ipReferred });
            if (referrerReferrals.length >= 3) {
                await Referral.create({
                    referrerId,
                    referredUserId,
                    referralCode,
                    rewardAmount: 25,
                    status: 'fraud_blocked',
                    ipReferred,
                });
                logger.warn('Referral blocked — same IP used too many times', { referrerId, ipReferred });
                return { success: false, message: 'Referral flagged for review' };
            }
        }

        await Referral.create({
            referrerId,
            referredUserId,
            referralCode,
            rewardAmount: 25,
            status: 'pending',
            ipReferred,
        });

        return { success: true, message: 'Referral registered! Complete your first order for rewards.' };
    } catch (err: any) {
        logger.error('registerReferral error', { error: err.message });
        return { success: false, message: 'Failed to process referral' };
    }
};

/**
 * Complete referral after first successful order — credit both users.
 */
export const completeReferral = async (referredUserId: string): Promise<void> => {
    try {
        const referral = await Referral.findOne({ referredUserId, status: 'pending' });
        if (!referral) return;

        // Check first order is delivered
        const deliveredOrders = await Order.countDocuments({
            user: referredUserId,
            type: 'parent',
            status: 'delivered',
        });
        if (deliveredOrders < 1) return;

        // Credit referred user
        if (!referral.referredCredited) {
            await createLedgerEntry({
                userId: referredUserId,
                type: 'credit',
                amount: referral.rewardAmount,
                category: 'wallet_credit',
                reference: `Referral reward — Welcome bonus (code: ${referral.referralCode})`,
            });
            referral.referredCredited = true;
        }

        // Credit referrer
        if (!referral.referrerCredited) {
            await createLedgerEntry({
                userId: referral.referrerId.toString(),
                type: 'credit',
                amount: referral.rewardAmount,
                category: 'wallet_credit',
                reference: `Referral reward — Friend joined with your code ${referral.referralCode}`,
            });
            referral.referrerCredited = true;
        }

        referral.status = 'completed';
        referral.completedAt = new Date();
        await referral.save();

        logger.info('Referral completed', {
            referrer: referral.referrerId,
            referred: referredUserId,
            reward: referral.rewardAmount,
        });
    } catch (err: any) {
        logger.error('completeReferral error', { error: err.message });
    }
};

// ─── CAMPAIGN / COUPON ENGINE ───────────────────────────────────────────────

/**
 * Validate and apply a campaign code at checkout.
 * Returns the discount to apply or an error.
 */
export const applyCampaignCode = async (
    code: string,
    userId: string,
    orderSubtotal: number,
    userRole: string,
    campusId = 'all'
): Promise<{ valid: boolean; discount: number; campaign?: any; message: string }> => {
    try {
        const campaign = await Campaign.findOne({
            code: code.toUpperCase(),
            isActive: true,
        });

        if (!campaign) return { valid: false, discount: 0, message: 'Invalid coupon code' };

        const now = new Date();

        // Check expiry
        if (now < campaign.startsAt) return { valid: false, discount: 0, message: 'Campaign not yet active' };
        if (now > campaign.expiresAt) return { valid: false, discount: 0, message: 'Coupon expired' };

        // Check campus
        if (campaign.campusId !== 'all' && campaign.campusId !== campusId) {
            return { valid: false, discount: 0, message: 'Coupon not valid for your campus' };
        }

        // Check total usage
        if (campaign.maxUsageTotal > 0 && campaign.currentUsage >= campaign.maxUsageTotal) {
            return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
        }

        // Check per-user usage (via orders — simple tracking)
        // In production we'd use a CouponUsage model; here we track via order metadata
        const userUsageCount = await Order.countDocuments({
            user: userId,
            'metadata.campaignCode': code.toUpperCase(),
        });
        if (userUsageCount >= campaign.maxUsagePerUser) {
            return { valid: false, discount: 0, message: 'You have already used this coupon' };
        }

        // Check min order value
        if (orderSubtotal < campaign.minOrderValue) {
            return { valid: false, discount: 0, message: `Minimum order ₹${campaign.minOrderValue} required` };
        }

        // Check role targeting
        if (campaign.targetRoles.length > 0 && !campaign.targetRoles.includes(userRole)) {
            return { valid: false, discount: 0, message: 'Coupon not valid for your account type' };
        }

        // Check first-order-only
        if (campaign.firstOrderOnly) {
            const prevOrders = await Order.countDocuments({ user: userId, type: 'parent', status: 'delivered' });
            if (prevOrders > 0) return { valid: false, discount: 0, message: 'Coupon valid for first order only' };
        }

        // Calculate discount
        let discount = 0;
        switch (campaign.type) {
            case 'percentage_discount':
                discount = (orderSubtotal * campaign.value) / 100;
                break;
            case 'flat_discount':
                discount = campaign.value;
                break;
            case 'free_delivery':
                discount = 30; // standard delivery fee
                break;
            case 'hero_bonus_boost':
                discount = 0; // hero bonus handled separately
                break;
        }

        // Apply max discount cap
        if (campaign.maxDiscount > 0 && discount > campaign.maxDiscount) {
            discount = campaign.maxDiscount;
        }

        // Don't discount more than order value
        discount = Math.min(discount, orderSubtotal);

        return {
            valid: true,
            discount: Math.round(discount * 100) / 100,
            campaign: {
                id: campaign._id,
                name: campaign.name,
                type: campaign.type,
                code: campaign.code,
            },
            message: `₹${discount.toFixed(0)} discount applied!`,
        };
    } catch (err: any) {
        logger.error('applyCampaignCode error', { error: err.message });
        return { valid: false, discount: 0, message: 'Failed to validate coupon' };
    }
};

/**
 * Record campaign usage after successful order placement.
 */
export const recordCampaignUsage = async (campaignCode: string): Promise<void> => {
    await Campaign.findOneAndUpdate(
        { code: campaignCode.toUpperCase() },
        { $inc: { currentUsage: 1 } }
    );
};

/**
 * Get referral stats for a user.
 */
export const getUserReferralStats = async (userId: string) => {
    const referralCode = generateReferralCode(userId);
    const [totalReferred, completedReferrals, pendingReferrals] = await Promise.all([
        Referral.countDocuments({ referrerId: userId }),
        Referral.countDocuments({ referrerId: userId, status: 'completed' }),
        Referral.countDocuments({ referrerId: userId, status: 'pending' }),
    ]);

    const totalEarned = completedReferrals * 25; // ₹25 per referral

    return {
        referralCode,
        totalReferred,
        completedReferrals,
        pendingReferrals,
        totalEarned,
    };
};
