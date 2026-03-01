import mongoose, { Document, Schema } from 'mongoose';

export type RiskFlagReason =
    | 'refund_cap_exceeded'
    | 'multiple_accounts_suspected'
    | 'suspicious_login_pattern'
    | 'high_cancellation_rate'
    | 'chargeback_filed'
    | 'bot_pattern_detected'
    | 'velocity_fraud'
    | 'manual_flag';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IRiskFlag extends Document {
    userId: mongoose.Types.ObjectId;
    reason: RiskFlagReason;
    severity: RiskSeverity;
    resolved: boolean;
    resolvedBy?: mongoose.Types.ObjectId;
    resolvedAt?: Date;
    resolvedNote?: string;
    metadata: Record<string, any>; // extra context: IP, amount, count, etc.
    ipAddress?: string;
    deviceFingerprint?: string;
    createdAt: Date;
    updatedAt: Date;
}

const RiskFlagSchema = new Schema<IRiskFlag>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        reason: {
            type: String,
            enum: [
                'refund_cap_exceeded', 'multiple_accounts_suspected', 'suspicious_login_pattern',
                'high_cancellation_rate', 'chargeback_filed', 'bot_pattern_detected',
                'velocity_fraud', 'manual_flag',
            ],
            required: true,
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            required: true,
            index: true,
        },
        resolved: { type: Boolean, default: false, index: true },
        resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: { type: Date },
        resolvedNote: { type: String },
        metadata: { type: Schema.Types.Mixed, default: {} },
        ipAddress: { type: String, index: true },          // for multi-account detection
        deviceFingerprint: { type: String, index: true },
    },
    { timestamps: true }
);

RiskFlagSchema.index({ resolved: 1, severity: 1, createdAt: -1 });
RiskFlagSchema.index({ userId: 1, reason: 1 });

export default mongoose.model<IRiskFlag>('RiskFlag', RiskFlagSchema);
