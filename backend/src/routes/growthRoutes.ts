import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import { getAdminAnalyticsDashboard, triggerSnapshot } from '../controllers/founderController';
import { getInvestorMetrics } from '../controllers/investorController';
import {
    createCampaign, getCampaigns, updateCampaign, applyCoupon,
    registerReferralHandler, getReferralStats, getAdminReferrals,
} from '../controllers/growthController';
import {
    getSurgeStatusHandler, toggleRainModeHandler,
    getOperationsOverview, getHeroIncentivesHandler, adminGetHeroIncentives,
    getHighRiskUsersHandler, getUserRiskScoreHandler, evaluateRiskHandler,
} from '../controllers/operationsController';

const router = express.Router();

// ══════════════════════════════════════════════════════════════
// PUBLIC / AUTHENTICATED ROUTES
// ══════════════════════════════════════════════════════════════

// Coupon application (any authenticated user)
router.post('/campaigns/apply', protect, applyCoupon);

// Referral routes (any authenticated user)
router.post('/referrals/register', protect, registerReferralHandler);
router.get('/referrals/stats', protect, getReferralStats);

// Hero incentive panel (hero only)
router.get('/hero/incentives', protect, authorize('hero'), getHeroIncentivesHandler);

// ══════════════════════════════════════════════════════════════
// ADMIN ROUTES — all require admin role
// ══════════════════════════════════════════════════════════════

// Admin Analytics Dashboard
router.get('/admin/analytics/dashboard', protect, authorize('admin'), getAdminAnalyticsDashboard);
router.post('/admin/analytics/snapshot', protect, authorize('admin'), triggerSnapshot);

// Investor Metrics Export
router.get('/admin/investor/metrics', protect, authorize('admin'), getInvestorMetrics);

// Campaign Management
router.get('/admin/campaigns', protect, authorize('admin'), getCampaigns);
router.post('/admin/campaigns', protect, authorize('admin'), createCampaign);
router.put('/admin/campaigns/:id', protect, authorize('admin'), updateCampaign);

// Referral Admin View
router.get('/admin/referrals', protect, authorize('admin'), getAdminReferrals);

// Dynamic Pricing & Surge
router.get('/admin/pricing/surge', protect, authorize('admin'), getSurgeStatusHandler);
router.post('/admin/pricing/rain', protect, authorize('admin'), toggleRainModeHandler);

// Operations (batching + hero capacity)
router.get('/admin/operations/overview', protect, authorize('admin'), getOperationsOverview);

// Hero Incentive Admin View
router.get('/admin/hero-incentives/:heroId', protect, authorize('admin'), adminGetHeroIncentives);

// Financial Risk Scores
router.get('/admin/risk-scores', protect, authorize('admin'), getHighRiskUsersHandler);
router.get('/admin/risk-scores/:userId', protect, authorize('admin'), getUserRiskScoreHandler);
router.post('/admin/risk-scores/:userId/evaluate', protect, authorize('admin'), evaluateRiskHandler);

export default router;
