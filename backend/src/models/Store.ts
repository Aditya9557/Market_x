import mongoose, { Document, Schema } from 'mongoose';

export interface IStoreSettings {
    openingHours?: string;
    deliveryRadius?: number;
    address?: string;
}

export interface IStore extends Document {
    name: string;
    owner: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    description?: string;
    category?: string;
    settings: IStoreSettings;
    location?: {
        type: string;
        coordinates: [number, number]; // [longitude, latitude]
    };
    stripeAccountId?: string;
    commissionRate: number;
    images: string[];
    zone: string;
    approvedForUniGuide: boolean;
    openForUniGuide: boolean;
    storeType: 'physical' | 'virtual';
}

const StoreSchema: Schema = new Schema({
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    description: { type: String, default: '' },
    category: {
        type: String,
        enum: ['food', 'books', 'stationery', 'electronics', 'clothing', 'services', 'other'],
        default: 'other'
    },
    settings: {
        openingHours: { type: String, default: '9:00 AM - 9:00 PM' },
        deliveryRadius: { type: Number, default: 5 },
        address: { type: String, default: '' }
    },
    stripeAccountId: { type: String },
    commissionRate: { type: Number, default: 10 },
    images: [{ type: String }],
    zone: {
        type: String,
        enum: ['north_gate', 'south_gate', 'hostel_area', 'academic_block', 'main_market', 'food_court', 'admin_block', 'other'],
        default: 'other'
    },
    approvedForUniGuide: { type: Boolean, default: false },
    openForUniGuide: { type: Boolean, default: false },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    },
    storeType: {
        type: String,
        enum: ['physical', 'virtual'],
        default: 'physical'
    }
}, {
    timestamps: true
});

// Indexes
StoreSchema.index({ status: 1 });
StoreSchema.index({ owner: 1 });
StoreSchema.index({ location: '2dsphere' }, { sparse: true });

const Store = mongoose.model<IStore>('Store', StoreSchema);
export default Store;
