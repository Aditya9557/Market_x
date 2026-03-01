import mongoose, { Document, Schema } from 'mongoose';

export interface IDeliveryDriver extends Document {
    user: mongoose.Types.ObjectId;
    isOnline: boolean;
    isAvailable: boolean;
    vehicleType: 'walk' | 'bicycle' | 'scooter' | 'car';
    zone?: string;
    activeOrderId?: mongoose.Types.ObjectId | null;
    acceptTimestamp?: Date;
    currentLocation: {
        type: string;
        coordinates: [number, number];
    };
    lastLocationUpdate: Date;
    totalDeliveries: number;
    totalEarnings: number;
    rating: number;
    ratingCount: number;
    currentDelivery: mongoose.Types.ObjectId | null;
    stripeAccountId?: string;
}

const deliveryDriverSchema = new Schema<IDeliveryDriver>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    isOnline: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: false },
    vehicleType: {
        type: String,
        enum: ['walk', 'bicycle', 'scooter', 'car'],
        default: 'walk'
    },
    zone: { type: String, default: 'default' },
    activeOrderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    acceptTimestamp: { type: Date, default: null },
    currentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    },
    lastLocationUpdate: { type: Date, default: Date.now },
    totalDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    ratingCount: { type: Number, default: 0 },
    currentDelivery: { type: Schema.Types.ObjectId, ref: 'Delivery', default: null },
    stripeAccountId: { type: String }
}, { timestamps: true });

// 2dsphere index for geospatial queries (find nearest driver)
deliveryDriverSchema.index({ currentLocation: '2dsphere' });

export default mongoose.model<IDeliveryDriver>('DeliveryDriver', deliveryDriverSchema);
