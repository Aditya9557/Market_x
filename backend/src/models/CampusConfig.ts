import mongoose, { Document, Schema } from 'mongoose';

export interface ICampusConfig extends Document {
    campusId: string;               // e.g. 'campus_main', 'campus_north'
    name: string;                   // "Main Campus"
    isActive: boolean;

    // Multi-campus expansion fields
    currency: string;               // e.g. 'INR', 'USD'
    currencySymbol: string;         // e.g. '₹', '$'
    taxPct: number;                 // tax % applied to orders
    timezone: string;               // e.g. 'Asia/Kolkata'

    // Delivery pricing
    baseFee: number;                // base delivery fee
    deliveryBaseCost: number;       // operational cost per delivery
    perKmRate: number;              // per km after first km
    maxDeliveryRadius: number;      // km

    // Financial — commission split
    platformCommission: number;     // % cut of each order
    heroCommission: number;         // % of delivery fee that goes to hero
    vendorCommission: number;       // % of order value vendor keeps
    maxRefundPerWeek: number;       // refund cap per user per week
    minOrderValue: number;          // minimum order value for delivery

    // Growth
    referralRewardAmount: number;   // wallet credit per referral
    referralEnabled: boolean;

    // Dynamic pricing toggles
    surgePricingEnabled: boolean;
    dynamicPricingEnabled: boolean;

    // Feature flags
    features: {
        heroDelivery: boolean;
        campusGuide: boolean;
        uniGuide: boolean;
        walletTopup: boolean;
        guestCheckout: boolean;
        disputeCenter: boolean;
        referralSystem: boolean;
        campaignEngine: boolean;
        dynamicPricing: boolean;
        retentionEngine: boolean;
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

        // Multi-campus
        currency: { type: String, default: 'INR' },
        currencySymbol: { type: String, default: '₹' },
        taxPct: { type: Number, default: 0, min: 0, max: 100 },
        timezone: { type: String, default: 'Asia/Kolkata' },

        baseFee: { type: Number, default: 30, min: 0 },
        deliveryBaseCost: { type: Number, default: 20, min: 0 },
        perKmRate: { type: Number, default: 5, min: 0 },
        maxDeliveryRadius: { type: Number, default: 5 },

        platformCommission: { type: Number, default: 10, min: 0, max: 100 },
        heroCommission: { type: Number, default: 70, min: 0, max: 100 },
        vendorCommission: { type: Number, default: 90, min: 0, max: 100 },
        maxRefundPerWeek: { type: Number, default: 500, min: 0 },
        minOrderValue: { type: Number, default: 50, min: 0 },

        referralRewardAmount: { type: Number, default: 25, min: 0 },
        referralEnabled: { type: Boolean, default: true },

        surgePricingEnabled: { type: Boolean, default: true },
        dynamicPricingEnabled: { type: Boolean, default: true },

        features: {
            heroDelivery: { type: Boolean, default: true },
            campusGuide: { type: Boolean, default: true },
            uniGuide: { type: Boolean, default: true },
            walletTopup: { type: Boolean, default: true },
            guestCheckout: { type: Boolean, default: false },
            disputeCenter: { type: Boolean, default: true },
            referralSystem: { type: Boolean, default: true },
            campaignEngine: { type: Boolean, default: true },
            dynamicPricing: { type: Boolean, default: true },
            retentionEngine: { type: Boolean, default: true },
        },

        minReliabilityScore: { type: Number, default: 2.0, min: 0, max: 5 },
        autosuspendThreshold: { type: Number, default: 30, min: 0, max: 100 },
    },
    { timestamps: true }
);

export default mongoose.model<ICampusConfig>('CampusConfig', CampusConfigSchema);
