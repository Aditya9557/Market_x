import { Request, Response } from 'express';
import { getAuditLogs } from '../services/auditLogService';
import { getUnresolvedFlags, resolveFlag } from '../services/fraudService';
import { getRecentReports, runReconciliation } from '../services/reconciliationService';
import CampusConfig from '../models/CampusConfig';
import { logAdminAction } from '../services/auditLogService';

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const getAuditLogsHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminId, actionType, limit } = req.query;
        const logs = await getAuditLogs({
            adminId: adminId as string,
            actionType: actionType as any,
            limit: limit ? parseInt(limit as string) : 50,
        });
        res.json({ logs, count: logs.length });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Risk Flags ───────────────────────────────────────────────────────────────

export const getRiskFlagsHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const flags = await getUnresolvedFlags(100);
        res.json({ flags, count: flags.length });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const resolveFlagHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const { note } = req.body;
        if (!note) { res.status(400).json({ message: 'Resolution note is required' }); return; }

        await resolveFlag(id, (req.user as any)._id.toString(), note);
        await logAdminAction({
            adminId: (req.user as any)._id.toString(),
            adminEmail: req.user!.email,
            actionType: 'risk_flag_cleared',
            targetType: 'risk_flag',
            targetId: id,
            metadata: { note },
            req,
        });
        res.json({ message: 'Risk flag resolved' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Reconciliation ───────────────────────────────────────────────────────────

export const getReconciliationReportsHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
        const reports = await getRecentReports(7);
        res.json({ reports });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const triggerReconciliationHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date } = req.body;
        const targetDate = date ? new Date(date) : undefined;
        // Run in background — don't await
        runReconciliation(targetDate).catch(console.error);
        res.json({ message: 'Reconciliation started. Check /admin/reconciliation for results in ~30s.' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// ─── Campus Config ────────────────────────────────────────────────────────────

export const getCampusConfigsHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
        const configs = await CampusConfig.find().lean();
        res.json({ configs });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const upsertCampusConfigHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { campusId } = req.params;
        const before = await CampusConfig.findOne({ campusId }).lean();
        const config = await CampusConfig.findOneAndUpdate(
            { campusId },
            { $set: req.body },
            { upsert: true, new: true, runValidators: true }
        );
        await logAdminAction({
            adminId: (req.user as any)._id.toString(),
            adminEmail: req.user!.email,
            actionType: 'campus_config_changed',
            targetType: 'campus_config',
            targetId: String(campusId),
            metadata: { before, after: req.body },
            req,
        });
        res.json({ config });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
