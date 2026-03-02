import mongoose, { Document, Schema } from 'mongoose';

/**
 * FinancialRiskScore — per-user dynamic risk scoring.
 * Composite score from multiple fraud vectors.
 * High risk → require OTP re-verification on checkout.
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface IFinancialRiskScore extends Document {
    userId: mongoose.Types.ObjectId;

    // Composite score (0–100, higher = riskier)
    score: number;
    level: RiskLevel;

    // Component scores (each 0–100)
    refundFrequencyScore: number;       // how often they claim refunds
    rapidCheckoutScore: number;         // suspiciously fast order patterns
    walletDrainScore: number;           // how fast they cash out wallet balance
    multiAccountScore: number;          // IP overlap with other accounts
    velocityScore: number;              // order pace anomalies
    chargebackScore: number;            // payment dispute history

    // State
    requiresOtp: boolean;               // if true, OTP required on next checkout
    isBlocked: boolean;                  // hard-block from ordering
    lastEvaluatedAt: Date;
    evaluationCount: number;

    createdAt: Date;
    updatedAt: Date;
}

const FinancialRiskScoreSchema = new Schema<IFinancialRiskScore>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        score: { type: Number, default: 0, min: 0, max: 100 },
        level: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'low',
        },
        refundFrequencyScore: { type: Number, default: 0, min: 0, max: 100 },
        rapidCheckoutScore: { type: Number, default: 0, min: 0, max: 100 },
        walletDrainScore: { type: Number, default: 0, min: 0, max: 100 },
        multiAccountScore: { type: Number, default: 0, min: 0, max: 100 },
        velocityScore: { type: Number, default: 0, min: 0, max: 100 },
        chargebackScore: { type: Number, default: 0, min: 0, max: 100 },

        requiresOtp: { type: Boolean, default: false },
        isBlocked: { type: Boolean, default: false },
        lastEvaluatedAt: { type: Date, default: Date.now },
        evaluationCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

FinancialRiskScoreSchema.index({ level: 1, score: -1 });

export default mongoose.model<IFinancialRiskScore>('FinancialRiskScore', FinancialRiskScoreSchema);
