import mongoose, { Document, Schema } from 'mongoose';

export interface IReconciliationMismatch {
    stripeId: string;
    stripeAmount: number;
    internalAmount?: number;
    type: 'missing_in_db' | 'amount_mismatch' | 'extra_in_db';
    description: string;
}

export interface IReconciliationReport extends Document {
    date: Date;                             // report date (00:00 UTC)
    stripeTransactionCount: number;
    internalTransactionCount: number;
    stripeTotalAmount: number;
    internalTotalAmount: number;
    mismatches: IReconciliationMismatch[];
    mismatchCount: number;
    status: 'clean' | 'mismatches_found' | 'error';
    errorMessage?: string;
    runAt: Date;                            // when cron executed
    durationMs: number;
    createdAt: Date;
}

const MismatchSchema = new Schema(
    {
        stripeId: { type: String, required: true },
        stripeAmount: { type: Number, required: true },
        internalAmount: { type: Number },
        type: { type: String, enum: ['missing_in_db', 'amount_mismatch', 'extra_in_db'], required: true },
        description: { type: String, required: true },
    },
    { _id: false }
);

const ReconciliationReportSchema = new Schema<IReconciliationReport>(
    {
        date: { type: Date, required: true, index: true, unique: true },
        stripeTransactionCount: { type: Number, default: 0 },
        internalTransactionCount: { type: Number, default: 0 },
        stripeTotalAmount: { type: Number, default: 0 },
        internalTotalAmount: { type: Number, default: 0 },
        mismatches: { type: [MismatchSchema], default: [] },
        mismatchCount: { type: Number, default: 0 },
        status: { type: String, enum: ['clean', 'mismatches_found', 'error'], required: true },
        errorMessage: { type: String },
        runAt: { type: Date, required: true },
        durationMs: { type: Number, default: 0 },
    },
    { timestamps: true }
);

ReconciliationReportSchema.index({ status: 1, date: -1 });

export default mongoose.model<IReconciliationReport>('ReconciliationReport', ReconciliationReportSchema);
