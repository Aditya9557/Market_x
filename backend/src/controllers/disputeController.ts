import { Request, Response } from 'express';
import * as disputeService from '../services/disputeService';
import logger from '../config/logger';

/**
 * @route   POST /api/disputes
 * @desc    File a dispute for an order (student)
 */
export const fileDispute = async (req: Request, res: Response): Promise<void> => {
    try {
        const dispute = await disputeService.createDispute({
            userId: (req.user!._id as any).toString(),
            orderId: req.body.orderId,
            reason: req.body.reason,
            description: req.body.description,
        });

        res.status(201).json({
            message: 'Dispute filed successfully. Our team will review it shortly.',
            dispute,
        });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        const status = errMsg.includes('already open') ? 409 : errMsg.includes('not found') ? 404 : 400;
        res.status(status).json({ message: errMsg });
    }
};

/**
 * @route   GET /api/disputes/my
 * @desc    Get current user's disputes
 */
export const getMyDisputes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { disputes } = await disputeService.getDisputesByStatus(undefined, 1, 50);
        const userId = (req.user!._id as any).toString();
        const userDisputes = disputes.filter(
            (d: any) => d.user._id?.toString() === userId
        );
        res.json({ disputes: userDisputes, total: userDisputes.length });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/admin/disputes
 * @desc    Get all disputes (admin)
 */
export const getDisputes = async (req: Request, res: Response): Promise<void> => {
    try {
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await disputeService.getDisputesByStatus(status, page, limit);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/disputes/:id/resolve
 * @desc    Resolve a dispute (admin)
 */
export const resolveDispute = async (req: Request, res: Response): Promise<void> => {
    try {
        const dispute = await disputeService.resolveDispute({
            disputeId: req.params.id as string,
            adminId: (req.user!._id as any).toString(),
            resolution: req.body.resolution,
            adminNotes: req.body.adminNotes,
            refundAmount: req.body.refundAmount,
        });

        res.json({
            message: `Dispute resolved: ${req.body.resolution}`,
            dispute,
        });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        const status = errMsg.includes('not found') ? 404 : errMsg.includes('already') ? 409 : 400;
        res.status(status).json({ message: errMsg });
    }
};
