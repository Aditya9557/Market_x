import mongoose, { Document, Schema } from 'mongoose';

export interface IDelivery extends Document {
    order: mongoose.Types.ObjectId;
    driver: mongoose.Types.ObjectId;
    customer: mongoose.Types.ObjectId;
    store: mongoose.Types.ObjectId;
    status: 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
    pickupAddress: string;
    deliveryAddress: string;
    deliveryFee: number;
    tip: number;
    estimatedTime: number;   // minutes
    actualPickupTime: Date | null;
    actualDeliveryTime: Date | null;
    locationHistory: Array<{
        coordinates: [number, number];
        timestamp: Date;
    }>;
    notes: string;
}

const deliverySchema = new Schema<IDelivery>({
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    status: {
        type: String,
        enum: ['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
        default: 'assigned'
    },
    pickupAddress: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    deliveryFee: { type: Number, default: 3.00 },
    tip: { type: Number, default: 0 },
    estimatedTime: { type: Number, default: 30 },
    actualPickupTime: { type: Date, default: null },
    actualDeliveryTime: { type: Date, default: null },
    locationHistory: [{
        coordinates: { type: [Number] },
        timestamp: { type: Date, default: Date.now }
    }],
    notes: { type: String, default: '' }
}, { timestamps: true });

deliverySchema.index({ driver: 1, status: 1 });
deliverySchema.index({ customer: 1 });
deliverySchema.index({ order: 1 });

export default mongoose.model<IDelivery>('Delivery', deliverySchema);
