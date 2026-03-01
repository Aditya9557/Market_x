import mongoose, { Document, Schema } from 'mongoose';

export interface ICampusPOI extends Document {
    poiId: string;
    legendNumber: number;
    name: string;
    zone: string;
    type: string;
    subtype?: string;
    description: string;
    location?: {
        type: string;
        coordinates: [number, number];
    };
    contact: {
        phone?: string;
        email?: string;
        website?: string;
    };
    hours: string;
    accessibility: {
        wheelchair: boolean;
        ramps: boolean;
        elevators: boolean;
    };
    images: string[];
    tags: string[];
    approved: boolean;
    linkedStore?: mongoose.Types.ObjectId;
    notes: string;
}

const CampusPOISchema: Schema = new Schema({
    poiId: { type: String, required: true, unique: true },
    legendNumber: { type: Number, required: true },
    name: { type: String, required: true },
    zone: {
        type: String,
        enum: ['north_gate', 'south_gate', 'hostel_area', 'academic_block', 'main_market', 'food_court', 'admin_block', 'other'],
        default: 'other'
    },
    type: {
        type: String,
        enum: ['building', 'shop', 'hostel', 'facility', 'parking', 'admin', 'medical', 'amenity', 'retail', 'residence'],
        required: true
    },
    subtype: { type: String },
    description: { type: String, default: '' },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    },
    contact: {
        phone: { type: String },
        email: { type: String },
        website: { type: String }
    },
    hours: { type: String, default: '' },
    accessibility: {
        wheelchair: { type: Boolean, default: false },
        ramps: { type: Boolean, default: false },
        elevators: { type: Boolean, default: false }
    },
    images: [{ type: String }],
    tags: [{ type: String }],
    approved: { type: Boolean, default: false },
    linkedStore: { type: Schema.Types.ObjectId, ref: 'Store' },
    notes: { type: String, default: '' }
}, {
    timestamps: true
});

// Indexes
CampusPOISchema.index({ type: 1 });
CampusPOISchema.index({ approved: 1 });
CampusPOISchema.index({ location: '2dsphere' }, { sparse: true });
CampusPOISchema.index({ name: 'text', description: 'text', tags: 'text' });

const CampusPOI = mongoose.model<ICampusPOI>('CampusPOI', CampusPOISchema);
export default CampusPOI;
