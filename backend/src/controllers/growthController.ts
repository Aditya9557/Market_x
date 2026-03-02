import { Request, Response } from 'express';
import Campaign from '../models/Campaign';
import Referral from '../models/Referral';
import {
    applyCampaignCode, recordCampaignUsage,
    registerReferral, getUserReferralStats, generateReferralCode,
} from '../services/campaignService';

// ── CAMPAIGN ENDPOINTS ──────────────────────────────────────

/** POST /api/admin/campaigns — Create a new campaign */
export const createCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
        const campaign = await Campaign.create({
            ...req.body,
            createdBy: (req as any).user._id,
        });
        res.status(201).json(campaign);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

/** GET /api/admin/campaigns — List all campaigns */
export const getCampaigns = async (_req: Request, res: Response): Promise<void> => {
    try {
        const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
        res.json(campaigns);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
};

/** PUT /api/admin/campaigns/:id — Update a campaign */
export const updateCampaign = async (req: Request, res: Response): Promise<void> => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!campaign) { res.status(404).json({ message: 'Campaign not found' }); return; }
        res.json(campaign);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};

/** POST /api/campaigns/apply — Apply a coupon code at checkout */
export const applyCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, orderSubtotal, campusId } = req.body;
        const user = (req as any).user;
        const result = await applyCampaignCode(code, user._id.toString(), orderSubtotal, user.role, campusId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ valid: false, discount: 0, message: 'Failed to apply coupon' });
    }
};

// ── REFERRAL ENDPOINTS ──────────────────────────────────────

/** POST /api/referrals/register — Register a referral on signup */
export const registerReferralHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { referralCode } = req.body;
        const userId = (req as any).user._id.toString();
        const ip = req.ip || req.socket.remoteAddress;
        const result = await registerReferral(referralCode, userId, ip);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Failed to register referral' });
    }
};

/** GET /api/referrals/stats — Get user's referral stats */
export const getReferralStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id.toString();
        const stats = await getUserReferralStats(userId);
        res.json(stats);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch referral stats' });
    }
};

/** GET /api/admin/referrals — Admin view of all referrals */
export const getAdminReferrals = async (req: Request, res: Response): Promise<void> => {
    try {
        const referrals = await Referral.find()
            .populate('referrerId', 'name email')
            .populate('referredUserId', 'name email')
            .sort({ createdAt: -1 }).limit(100).lean();
        res.json(referrals);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch referrals' });
    }
};
