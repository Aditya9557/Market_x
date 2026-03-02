import mongoose, { Document, Schema } from 'mongoose';

/**
 * Referral — tracks user-to-user referral flows.
 * Both referrer and referred get wallet credit after first successful order.
 * Anti-fraud: same IP / email prefix matching blocks self-referrals.
 */
export interface IReferral extends Document {
    referrerId: mongoose.Types.ObjectId;
    referredUserId: mongoose.Types.ObjectId;
    referralCode: string;
    rewardAmount: number;               // ₹ each user gets
    status: 'pending' | 'completed' | 'fraud_blocked' | 'expired';
    referrerCredited: boolean;
    referredCredited: boolean;
    completedAt?: Date;
    ipReferrer?: string;
    ipReferred?: string;
    campusId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
    {
        referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        referredUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        referralCode: { type: String, required: true, index: true },
        rewardAmount: { type: Number, default: 25, min: 0 },    // ₹25 default reward
        status: {
            type: String,
            enum: ['pending', 'completed', 'fraud_blocked', 'expired'],
            default: 'pending',
        },
        referrerCredited: { type: Boolean, default: false },
        referredCredited: { type: Boolean, default: false },
        completedAt: { type: Date },
        ipReferrer: { type: String },
        ipReferred: { type: String },
        campusId: { type: String },
    },
    { timestamps: true }
);

ReferralSchema.index({ referrerId: 1, referredUserId: 1 }, { unique: true });
ReferralSchema.index({ status: 1 });

export default mongoose.model<IReferral>('Referral', ReferralSchema);
