import { Request } from 'express';
import AdminActionLog, { AdminActionType, AdminTargetType } from '../models/AdminActionLog';
import logger from '../config/logger';

interface LogActionParams {
    adminId: string;
    adminEmail: string;
    actionType: AdminActionType;
    targetType: AdminTargetType;
    targetId: string;
    targetLabel?: string;
    metadata?: Record<string, any>;
    req: Request;
}

/**
 * Append-only admin audit log. Call from every admin controller action.
 * Never throws — audit failure is logged but doesn't block the actual action.
 */
export const logAdminAction = async (params: LogActionParams): Promise<void> => {
    try {
        const ip = (params.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || params.req.ip
            || 'unknown';
        const userAgent = params.req.headers['user-agent'] || '';

        await AdminActionLog.create({
            adminId: params.adminId,
            adminEmail: params.adminEmail,
            actionType: params.actionType,
            targetType: params.targetType,
            targetId: params.targetId,
            targetLabel: params.targetLabel,
            metadata: params.metadata || {},
            ipAddress: ip,
            userAgent,
        });
    } catch (err: any) {
        // Never block admin operations due to audit log failure
        logger.error('Failed to write admin audit log', { error: err.message, params });
    }
};

/**
 * Retrieve paginated audit logs with optional filters.
 */
export const getAuditLogs = async (opts: {
    adminId?: string;
    actionType?: AdminActionType;
    limit?: number;
    before?: Date;
}) => {
    const { adminId, actionType, limit = 50, before } = opts;
    const filter: Record<string, any> = {};
    if (adminId) filter.adminId = adminId;
    if (actionType) filter.actionType = actionType;
    if (before) filter.createdAt = { $lt: before };

    return AdminActionLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};
