import mongoose, { Document, Schema } from 'mongoose';

export type AdminActionType =
    | 'hero_approved'
    | 'hero_rejected'
    | 'shop_approved'
    | 'shop_rejected'
    | 'dispute_resolved'
    | 'refund_issued'
    | 'user_banned'
    | 'user_suspended'
    | 'user_unsuspended'
    | 'commission_changed'
    | 'campus_config_changed'
    | 'risk_flag_cleared'
    | 'product_removed'
    | 'order_cancelled_admin';

export type AdminTargetType = 'user' | 'store' | 'order' | 'dispute' | 'hero_application' | 'campus_config' | 'risk_flag';

export interface IAdminActionLog extends Document {
    adminId: mongoose.Types.ObjectId;
    adminEmail: string;             // snapshot at time of action
    actionType: AdminActionType;
    targetType: AdminTargetType;
    targetId: string;               // ObjectId or string key
    targetLabel?: string;           // human-readable (email, name, etc.)
    metadata: Record<string, any>;  // rich context — before/after, reason, amount
    ipAddress: string;
    userAgent?: string;
    createdAt: Date;
}

const AdminActionLogSchema = new Schema<IAdminActionLog>(
    {
        adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        adminEmail: { type: String, required: true },
        actionType: {
            type: String,
            enum: [
                'hero_approved', 'hero_rejected', 'shop_approved', 'shop_rejected',
                'dispute_resolved', 'refund_issued', 'user_banned', 'user_suspended',
                'user_unsuspended', 'commission_changed', 'campus_config_changed',
                'risk_flag_cleared', 'product_removed', 'order_cancelled_admin',
            ],
            required: true,
            index: true,
        },
        targetType: {
            type: String,
            enum: ['user', 'store', 'order', 'dispute', 'hero_application', 'campus_config', 'risk_flag'],
            required: true,
        },
        targetId: { type: String, required: true },
        targetLabel: { type: String },
        metadata: { type: Schema.Types.Mixed, default: {} },
        ipAddress: { type: String, required: true },
        userAgent: { type: String },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // append-only
    }
);

// Compound index for dashboard queries
AdminActionLogSchema.index({ createdAt: -1 });
AdminActionLogSchema.index({ adminId: 1, createdAt: -1 });
AdminActionLogSchema.index({ actionType: 1, createdAt: -1 });

export default mongoose.model<IAdminActionLog>('AdminActionLog', AdminActionLogSchema);
