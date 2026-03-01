import mongoose, { Schema, Document } from 'mongoose';

export interface IHeroApplication extends Document {
    user: mongoose.Types.ObjectId;
    fullName: string;
    campusEmail: string;
    phone: string;
    zone: string;
    preferredHours: ('morning' | 'afternoon' | 'night')[];
    bankDetails?: string;
    studentIdUrl?: string;
    selfieUrl?: string;
    vehicleType: 'walk' | 'bicycle' | 'scooter' | 'car';
    agreedToRules: boolean;
    status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
    rejectionReason?: string;
    adminNotes?: string;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    onboardingCompleted: boolean;
    onboardingChecklist: {
        watchedVideo: boolean;
        completedQuiz: boolean;
        acceptedSafetyRules: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

const heroApplicationSchema = new Schema<IHeroApplication>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        fullName: { type: String, required: true, trim: true },
        campusEmail: { type: String, required: true, trim: true, lowercase: true },
        phone: {
            type: String,
            required: true,
            validate: {
                validator: (v: string) => /^\d{10}$/.test(v),
                message: 'Phone must be exactly 10 digits',
            },
        },
        zone: { type: String, required: true, trim: true },
        preferredHours: {
            type: [{ type: String, enum: ['morning', 'afternoon', 'night'] }],
            required: true,
            validate: {
                validator: (v: string[]) => v.length > 0,
                message: 'At least one preferred hour slot is required',
            },
        },
        bankDetails: { type: String, trim: true },
        studentIdUrl: { type: String },
        selfieUrl: { type: String },
        vehicleType: {
            type: String,
            enum: ['walk', 'bicycle', 'scooter', 'car'],
            required: true,
            default: 'walk',
        },
        agreedToRules: { type: Boolean, required: true, default: false },
        status: {
            type: String,
            enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'],
            default: 'submitted',
            index: true,
        },
        rejectionReason: { type: String, trim: true },
        adminNotes: { type: String, trim: true },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: { type: Date },
        onboardingCompleted: { type: Boolean, default: false },
        onboardingChecklist: {
            watchedVideo: { type: Boolean, default: false },
            completedQuiz: { type: Boolean, default: false },
            acceptedSafetyRules: { type: Boolean, default: false },
        },
    },
    { timestamps: true }
);

// Ensure one application per user (latest)
heroApplicationSchema.index({ user: 1, status: 1 });
heroApplicationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IHeroApplication>('HeroApplication', heroApplicationSchema);
