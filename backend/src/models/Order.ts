import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
    product: mongoose.Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
}

export interface IOrder extends Document {
    orderNumber: string;
    user: mongoose.Types.ObjectId;
    type: 'parent' | 'child';
    parentOrder?: mongoose.Types.ObjectId;
    store?: mongoose.Types.ObjectId;
    items: IOrderItem[];
    subtotal: number;
    commission: number;
    total: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'ready_for_pickup'
    | 'hero_assigned' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelled';
    paymentStatus: 'pending' | 'paid' | 'refunded' | 'distributed';
    heroId?: mongoose.Types.ObjectId;
    deliveryFee: number;
    stripePaymentIntentId?: string;
    razorpayPaymentId?: string;
    stripeTransferGroupId?: string;
    deliveryAddress?: string;
    notes?: string;
    orderType: 'delivery' | 'takeaway';
    // Phase-1 OTP
    deliveryOtpHash?: string;
    otpExpiresAt?: Date;
    otpAttempts: number;
    otpVerified: boolean;
    otpLocked: boolean;
    // Phase-1 timestamps
    acceptedAt?: Date;
    pickedUpAt?: Date;
    deliveredAt?: Date;
}

const OrderItemSchema: Schema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const OrderSchema: Schema = new Schema({
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['parent', 'child'],
        required: true
    },
    parentOrder: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    store: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    commission: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'ready_for_pickup',
            'hero_assigned', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled'],
        default: 'pending'
    },
    heroId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deliveryFee: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'distributed'],
        default: 'pending'
    },
    stripePaymentIntentId: { type: String },
    razorpayPaymentId: { type: String },
    stripeTransferGroupId: { type: String },
    deliveryAddress: { type: String, default: '' },
    notes: { type: String, default: '' },
    orderType: {
        type: String,
        enum: ['delivery', 'takeaway'],
        default: 'delivery'
    },
    // Phase-1 OTP
    deliveryOtpHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpVerified: { type: Boolean, default: false },
    otpLocked: { type: Boolean, default: false },
    // Phase-1 timestamps
    acceptedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
}, {
    timestamps: true
});

// Indexes
OrderSchema.index({ user: 1, type: 1 });
OrderSchema.index({ store: 1, type: 1 });
OrderSchema.index({ parentOrder: 1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ status: 1 });

// Generate order number BEFORE validation (pre-validate runs before required checks)
OrderSchema.pre('validate', function () {
    if (this.isNew && !this.orderNumber) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.orderNumber = `ORD-${dateStr}-${random}`;
    }
});

const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
