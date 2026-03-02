import mongoose, { Document, Schema } from 'mongoose';

/**
 * HeroIncentive — tracks hero-specific bonuses, streaks, and multipliers.
 * Weekly performance bonuses, acceptance streaks, and dynamic penalty adjustments.
 */
export type IncentiveType = 'weekly_bonus' | 'streak_reward' | 'peak_bonus' | 'rating_bonus' | 'cancellation_penalty';

export interface IHeroIncentive extends Document {
    heroId: mongoose.Types.ObjectId;
    type: IncentiveType;
    amount: number;                     // ₹ positive for bonus, negative for penalty
    multiplier: number;                 // applied multiplier (1.0 = no change)
    periodStart: Date;
    periodEnd: Date;
    status: 'pending' | 'credited' | 'cancelled';

    // Performance snapshot at time of calculation
    performanceSnapshot: {
        deliveriesCompleted: number;
        acceptanceStreak: number;
        avgRating: number;
        cancellationPct: number;
        peakHourDeliveries: number;
        reliabilityScore: number;
    };

    creditedAt?: Date;
    campusId?: string;
    createdAt: Date;
}

const HeroIncentiveSchema = new Schema<IHeroIncentive>(
    {
        heroId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: {
            type: String,
            enum: ['weekly_bonus', 'streak_reward', 'peak_bonus', 'rating_bonus', 'cancellation_penalty'],
            required: true,
        },
        amount: { type: Number, required: true },
        multiplier: { type: Number, default: 1.0 },
        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true },
        status: {
            type: String,
            enum: ['pending', 'credited', 'cancelled'],
            default: 'pending',
        },
        performanceSnapshot: {
            deliveriesCompleted: { type: Number, default: 0 },
            acceptanceStreak: { type: Number, default: 0 },
            avgRating: { type: Number, default: 5.0 },
            cancellationPct: { type: Number, default: 0 },
            peakHourDeliveries: { type: Number, default: 0 },
            reliabilityScore: { type: Number, default: 5.0 },
        },
        creditedAt: { type: Date },
        campusId: { type: String },
    },
    { timestamps: true }
);

HeroIncentiveSchema.index({ heroId: 1, periodStart: -1 });
HeroIncentiveSchema.index({ status: 1 });

export default mongoose.model<IHeroIncentive>('HeroIncentive', HeroIncentiveSchema);
