import mongoose, { Document, Schema } from 'mongoose';

/**
 * Immutable ledger entry — every wallet balance change MUST produce a LedgerEntry.
 * The wallet balance is either derived from sum(entries) or kept in sync via reconciliation.
 * Entries are NEVER mutated or deleted.
 */
export interface ILedgerEntry extends Document {
    user: mongoose.Types.ObjectId;
    type: 'credit' | 'debit';
    amount: number;                     // always positive
    balanceAfter: number;               // snapshot of balance after this entry
    category: 'payment' | 'refund' | 'wallet_credit' | 'delivery_earning' | 'tip' |
    'platform_fee' | 'top_up' | 'withdrawal' | 'dispute_credit' | 'adjustment';
    reference: string;                  // human-readable reference
    orderId?: mongoose.Types.ObjectId;
    disputeId?: mongoose.Types.ObjectId;
    stripePaymentIntentId?: string;
    razorpayPaymentId?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

const LedgerEntrySchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true },
    category: {
        type: String,
        enum: ['payment', 'refund', 'wallet_credit', 'delivery_earning', 'tip',
            'platform_fee', 'top_up', 'withdrawal', 'dispute_credit', 'adjustment'],
        required: true,
    },
    reference: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute' },
    stripePaymentIntentId: { type: String },
    razorpayPaymentId: { type: String },
    metadata: { type: Schema.Types.Mixed },
}, {
    timestamps: true,
});

LedgerEntrySchema.index({ user: 1, createdAt: -1 });
LedgerEntrySchema.index({ orderId: 1 });
LedgerEntrySchema.index({ category: 1 });

const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
export default LedgerEntry;
