import mongoose, { Document, Schema } from 'mongoose';

/**
 * Campaign — promotional campaign engine for admin-driven growth.
 * Supports: percentage discounts, flat discounts, free delivery, and hero bonus boosts.
 */
export type CampaignType = 'percentage_discount' | 'flat_discount' | 'free_delivery' | 'hero_bonus_boost';

export interface ICampaign extends Document {
    name: string;
    description: string;
    type: CampaignType;
    value: number;                      // discount %, flat ₹ amount, or bonus multiplier
    code: string;                       // coupon code e.g. "WELCOME50"
    campusId: string;                   // 'all' or specific campus
    isActive: boolean;

    // Constraints
    minOrderValue: number;              // minimum order value to apply
    maxDiscount: number;                // cap on discount amount
    maxUsageTotal: number;              // total uses across all users (0 = unlimited)
    maxUsagePerUser: number;            // max uses per individual user
    currentUsage: number;               // total times used

    // Validity
    startsAt: Date;
    expiresAt: Date;

    // Targeting
    targetRoles: string[];              // ['student', 'hero'] — empty = all
    firstOrderOnly: boolean;            // only for users with 0 previous orders

    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
    {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        type: {
            type: String,
            enum: ['percentage_discount', 'flat_discount', 'free_delivery', 'hero_bonus_boost'],
            required: true,
        },
        value: { type: Number, required: true, min: 0 },
        code: { type: String, required: true, uppercase: true, unique: true, index: true },
        campusId: { type: String, default: 'all' },
        isActive: { type: Boolean, default: true },

        minOrderValue: { type: Number, default: 0 },
        maxDiscount: { type: Number, default: 0 },        // 0 = no cap
        maxUsageTotal: { type: Number, default: 0 },      // 0 = unlimited
        maxUsagePerUser: { type: Number, default: 1 },
        currentUsage: { type: Number, default: 0 },

        startsAt: { type: Date, required: true },
        expiresAt: { type: Date, required: true },

        targetRoles: [{ type: String, enum: ['student', 'shopkeeper', 'hero', 'admin'] }],
        firstOrderOnly: { type: Boolean, default: false },

        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

CampaignSchema.index({ isActive: 1, expiresAt: 1 });
CampaignSchema.index({ campusId: 1 });

export default mongoose.model<ICampaign>('Campaign', CampaignSchema);
