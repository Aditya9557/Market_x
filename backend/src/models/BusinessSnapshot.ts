import mongoose, { Document, Schema } from 'mongoose';

/**
 * BusinessSnapshot — nightly snapshot of platform KPIs.
 * Stored daily by the businessAnalyticsWorker cron.
 * Powers the Founder Dashboard and Investor Metrics Export.
 */
export interface IBusinessSnapshot extends Document {
    date: Date;                         // date this snapshot covers (midnight UTC)
    campusId: string;                   // 'all' for global, or specific campus

    // Revenue metrics
    gmv: number;                        // Gross Merchandise Value
    platformNetRevenue: number;         // Commission + delivery fee share
    deliveryRevenue: number;            // Platform cut from delivery fees
    commissionRevenue: number;          // Commission from store orders

    // Order metrics
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;

    // User metrics
    totalUsers: number;
    activeUsers: number;               // placed order in last 30 days
    newUsers: number;                  // signed up today
    ordersPerActiveUser: number;

    // Hero metrics
    totalHeroes: number;
    activeHeroes: number;              // accepted delivery in last 7 days
    heroUtilizationRate: number;       // deliveries / (heroes * hours available) %
    avgHeroEarning: number;

    // Quality metrics
    cancellationPct: number;
    refundPct: number;
    repeatPurchasePct: number;         // % of users who ordered more than once in 30 days

    // Financial estimates
    ltvEstimate: number;               // Average LTV (revenue per user over projected lifetime)
    cacEstimate: number;               // Manual or computed cost of acquisition
    contributionMargin: number;        // Per-order margin after variable costs
    burnEstimate: number;              // Estimated monthly burn (manual input + compute)

    // Retention
    day7Retention: number;             // % of users active after 7 days
    day30Retention: number;            // % of users active after 30 days

    // Peak data
    peakHourOrders: number;            // orders during 7-10 PM
    peakHourPct: number;               // % of total orders during peak

    createdAt: Date;
}

const BusinessSnapshotSchema = new Schema<IBusinessSnapshot>(
    {
        date: { type: Date, required: true },
        campusId: { type: String, default: 'all', index: true },

        gmv: { type: Number, default: 0 },
        platformNetRevenue: { type: Number, default: 0 },
        deliveryRevenue: { type: Number, default: 0 },
        commissionRevenue: { type: Number, default: 0 },

        totalOrders: { type: Number, default: 0 },
        deliveredOrders: { type: Number, default: 0 },
        cancelledOrders: { type: Number, default: 0 },
        averageOrderValue: { type: Number, default: 0 },

        totalUsers: { type: Number, default: 0 },
        activeUsers: { type: Number, default: 0 },
        newUsers: { type: Number, default: 0 },
        ordersPerActiveUser: { type: Number, default: 0 },

        totalHeroes: { type: Number, default: 0 },
        activeHeroes: { type: Number, default: 0 },
        heroUtilizationRate: { type: Number, default: 0 },
        avgHeroEarning: { type: Number, default: 0 },

        cancellationPct: { type: Number, default: 0 },
        refundPct: { type: Number, default: 0 },
        repeatPurchasePct: { type: Number, default: 0 },

        ltvEstimate: { type: Number, default: 0 },
        cacEstimate: { type: Number, default: 0 },
        contributionMargin: { type: Number, default: 0 },
        burnEstimate: { type: Number, default: 0 },

        day7Retention: { type: Number, default: 0 },
        day30Retention: { type: Number, default: 0 },

        peakHourOrders: { type: Number, default: 0 },
        peakHourPct: { type: Number, default: 0 },
    },
    { timestamps: true }
);

BusinessSnapshotSchema.index({ date: -1, campusId: 1 }, { unique: true });

export default mongoose.model<IBusinessSnapshot>('BusinessSnapshot', BusinessSnapshotSchema);
