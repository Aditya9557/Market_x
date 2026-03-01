import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'shopkeeper' | 'admin' | 'hero';
    status: 'pending' | 'active' | 'rejected';
    shopName?: string;
    store?: mongoose.Types.ObjectId;
    isHeroMode?: boolean;
    walletBalance: number;
    locationServicesEnabled?: boolean;
    currentLocation?: {
        type: string;
        coordinates: [number, number]; // [longitude, latitude]
    };
    matchPassword: (enteredPassword: string) => Promise<boolean>;
}

const UserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['student', 'shopkeeper', 'admin', 'hero'],
        default: 'student'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'rejected'],
        default: 'active'
    },
    shopName: { type: String },
    store: { type: Schema.Types.ObjectId, ref: 'Store' },
    isHeroMode: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 },
    locationServicesEnabled: { type: Boolean, default: false },
    currentLocation: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    }
}, {
    timestamps: true
});

// 2dsphere index — sparse so users without location data aren't indexed
UserSchema.index({ currentLocation: '2dsphere' }, { sparse: true });

UserSchema.pre('save', async function () {
    const user = this as unknown as IUser;
    if (!user.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
