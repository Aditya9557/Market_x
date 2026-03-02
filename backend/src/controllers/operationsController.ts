import { Request, Response } from 'express';
import { getSurgeStatus, toggleRainMode } from '../services/dynamicPricingService';
import { getOperationalOverview } from '../services/routeOptimizerService';
import { calculateWeeklyIncentives, getHeroEarningsForecast } from '../services/heroIncentiveService';
import { evaluateUserRisk, getHighRiskUsers, getUserRiskScore } from '../services/financialRiskService';

// ── DYNAMIC PRICING ─────────────────────────────────────────

/** GET /api/admin/pricing/surge — Current surge pricing status */
export const getSurgeStatusHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const campusId = (req.query.campusId as string) || 'campus_main';
        const status = await getSurgeStatus(campusId);
        res.json(status);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch surge status' });
    }
};

/** POST /api/admin/pricing/rain — Toggle rain mode */
export const toggleRainModeHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { campusId, enabled } = req.body;
        await toggleRainMode(campusId || 'campus_main', enabled);
        res.json({ message: `Rain mode ${enabled ? 'activated' : 'deactivated'}` });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to toggle rain mode' });
    }
};

// ── OPERATIONS ──────────────────────────────────────────────

/** GET /api/admin/operations/overview — Batching + hero capacity */
export const getOperationsOverview = async (_req: Request, res: Response): Promise<void> => {
    try {
        const overview = await getOperationalOverview();
        res.json(overview);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch operations overview' });
    }
};

// ── HERO INCENTIVES ─────────────────────────────────────────

/** GET /api/hero/incentives — Hero earnings forecast */
export const getHeroIncentivesHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const heroId = (req as any).user._id.toString();
        const forecast = await getHeroEarningsForecast(heroId);
        res.json(forecast);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch incentives' });
    }
};

/** GET /api/admin/hero-incentives/:heroId — Admin view of hero incentives */
export const adminGetHeroIncentives = async (req: Request, res: Response): Promise<void> => {
    try {
        const forecast = await getHeroEarningsForecast(req.params.heroId as string);
        res.json(forecast);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch hero incentives' });
    }
};

// ── FINANCIAL RISK ──────────────────────────────────────────

/** GET /api/admin/risk-scores — High risk users */
export const getHighRiskUsersHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
        const users = await getHighRiskUsers();
        res.json(users);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch risk scores' });
    }
};

/** GET /api/admin/risk-scores/:userId — Individual risk score */
export const getUserRiskScoreHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const score = await getUserRiskScore(req.params.userId as string);
        res.json(score);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch risk score' });
    }
};

/** POST /api/admin/risk-scores/:userId/evaluate — Re-evaluate */
export const evaluateRiskHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const score = await evaluateUserRisk(req.params.userId as string);
        res.json(score);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to evaluate risk' });
    }
};
