import mongoose, { Document, Schema } from 'mongoose';

export interface IDispute extends Document {
    order: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;            // student who filed
    store?: mongoose.Types.ObjectId;
    heroId?: mongoose.Types.ObjectId;
    reason: 'wrong_item' | 'never_delivered' | 'damaged' | 'quality' | 'overcharged' | 'other';
    description: string;
    status: 'open' | 'under_review' | 'resolved' | 'rejected';
    resolution?: 'refund_full' | 'refund_partial' | 'wallet_credit' | 'rejected' | 'resolved_no_action';
    refundAmount?: number;
    adminNotes?: string;
    resolvedBy?: mongoose.Types.ObjectId;     // admin who resolved
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const DisputeSchema: Schema = new Schema({
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    store: { type: Schema.Types.ObjectId, ref: 'Store' },
    heroId: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: {
        type: String,
        enum: ['wrong_item', 'never_delivered', 'damaged', 'quality', 'overcharged', 'other'],
        required: true,
    },
    description: { type: String, required: true, maxlength: 2000 },
    status: {
        type: String,
        enum: ['open', 'under_review', 'resolved', 'rejected'],
        default: 'open',
    },
    resolution: {
        type: String,
        enum: ['refund_full', 'refund_partial', 'wallet_credit', 'rejected', 'resolved_no_action'],
    },
    refundAmount: { type: Number, min: 0, default: 0 },
    adminNotes: { type: String, maxlength: 2000 },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
}, {
    timestamps: true,
});

DisputeSchema.index({ user: 1 });
DisputeSchema.index({ order: 1 });
DisputeSchema.index({ status: 1 });

const Dispute = mongoose.model<IDispute>('Dispute', DisputeSchema);
export default Dispute;
