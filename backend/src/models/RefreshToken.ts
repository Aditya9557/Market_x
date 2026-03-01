import mongoose, { Document, Schema } from 'mongoose';

export interface IRefreshToken extends Document {
    user: mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
    revoked: boolean;
    revokedAt?: Date;
    replacedByToken?: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt: Date;
}

const RefreshTokenSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    replacedByToken: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String },
}, {
    timestamps: true,
});

RefreshTokenSchema.index({ token: 1 });
RefreshTokenSchema.index({ user: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-cleanup

const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
export default RefreshToken;
