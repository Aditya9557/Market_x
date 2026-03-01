import { Request, Response } from 'express';
import { getHeroEconomics, evaluateHeroSuspension } from '../services/heroEconomicsService';
import DeliveryDriver from '../models/DeliveryDriver';

/**
 * GET /api/hero/economics
 * Returns the current hero's full earnings + performance dashboard data.
 */
export const getHeroEconomicsHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req.user as any)._id.toString();
        const data = await getHeroEconomics(userId);
        if (!data) {
            res.status(404).json({ message: 'Hero profile not found' });
            return;
        }
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * POST /api/hero/evaluate-suspension  (internal use / admin trigger)
 * Manually trigger suspension evaluation for a hero.
 */
export const evaluateSuspensionHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const heroUserId = req.body.heroUserId || (req.user as any)._id.toString();
        const result = await evaluateHeroSuspension(heroUserId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /api/admin/hero-economics/:heroId
 * Admin view of any hero's economics.
 */
export const adminGetHeroEconomicsHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { heroId } = req.params;
        const driver = await DeliveryDriver.findById(heroId).lean();
        if (!driver) { res.status(404).json({ message: 'Hero not found' }); return; }
        const data = await getHeroEconomics((driver as any).user.toString());
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
