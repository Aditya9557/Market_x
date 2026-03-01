import mongoose, { Document, Schema } from 'mongoose';

export interface ICampusConfig extends Document {
    campusId: string;               // e.g. 'campus_main', 'campus_north'
    name: string;                   // "Main Campus"
    isActive: boolean;

    // Delivery pricing
    baseFee: number;                // ₹ base delivery fee
    perKmRate: number;              // ₹ per km after first km
    maxDeliveryRadius: number;      // km

    // Financial
    platformCommission: number;     // % cut of each order
    heroCommission: number;         // % of delivery fee that goes to hero
    maxRefundPerWeek: number;       // ₹ refund cap per user per week
    minOrderValue: number;          // minimum order value for delivery

    // Feature flags
    features: {
        heroDelivery: boolean;
        campusGuide: boolean;
        uniGuide: boolean;
        walletTopup: boolean;
        guestCheckout: boolean;
        disputeCenter: boolean;
    };

    // Hero discipline
    minReliabilityScore: number;    // below this, hero auto-suspended
    autosuspendThreshold: number;   // cancellation % to trigger suspension

    createdAt: Date;
    updatedAt: Date;
}

const CampusConfigSchema = new Schema<ICampusConfig>(
    {
        campusId: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        isActive: { type: Boolean, default: true },

        baseFee: { type: Number, default: 15, min: 0 },
        perKmRate: { type: Number, default: 5, min: 0 },
        maxDeliveryRadius: { type: Number, default: 5 },

        platformCommission: { type: Number, default: 10, min: 0, max: 100 },
        heroCommission: { type: Number, default: 70, min: 0, max: 100 },
        maxRefundPerWeek: { type: Number, default: 500, min: 0 },
        minOrderValue: { type: Number, default: 50, min: 0 },

        features: {
            heroDelivery: { type: Boolean, default: true },
            campusGuide: { type: Boolean, default: true },
            uniGuide: { type: Boolean, default: true },
            walletTopup: { type: Boolean, default: true },
            guestCheckout: { type: Boolean, default: false },
            disputeCenter: { type: Boolean, default: true },
        },

        minReliabilityScore: { type: Number, default: 2.0, min: 0, max: 5 },
        autosuspendThreshold: { type: Number, default: 30, min: 0, max: 100 },
    },
    { timestamps: true }
);

export default mongoose.model<ICampusConfig>('CampusConfig', CampusConfigSchema);
