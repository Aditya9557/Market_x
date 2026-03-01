import Stripe from 'stripe';
import ReconciliationReport from '../models/ReconciliationReport';
import LedgerEntry from '../models/LedgerEntry';
import logger from '../config/logger';
import { Sentry } from '../config/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

/**
 * Run daily reconciliation: compare Stripe transactions with internal LedgerEntry records.
 * Designed to be called by a cron job or manually by an admin.
 */
export const runReconciliation = async (targetDate?: Date): Promise<void> => {
    const startTime = Date.now();
    const reportDate = targetDate || getYesterday();
    const dayStart = new Date(reportDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(reportDate);
    dayEnd.setHours(23, 59, 59, 999);

    logger.info('Starting Stripe reconciliation', { date: dayStart.toISOString() });

    try {
        // ── 1. Fetch Stripe PaymentIntents from the target day ──────────────────
        const stripePayments: Array<{ id: string; amount: number; currency: string; status: string }> = [];
        let hasMore = true;
        let startingAfter: string | undefined;

        while (hasMore) {
            const params: Stripe.PaymentIntentListParams = {
                limit: 100,
                created: {
                    gte: Math.floor(dayStart.getTime() / 1000),
                    lte: Math.floor(dayEnd.getTime() / 1000),
                },
            };
            if (startingAfter) params.starting_after = startingAfter;

            const page = await stripe.paymentIntents.list(params);
            for (const pi of page.data) {
                if (pi.status === 'succeeded') {
                    stripePayments.push({
                        id: pi.id,
                        amount: pi.amount / 100, // paise → rupees
                        currency: pi.currency,
                        status: pi.status,
                    });
                }
            }
            hasMore = page.has_more;
            if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
        }

        // ── 2. Fetch internal ledger entries for the same day ───────────────────
        const internalEntries = await LedgerEntry.find({
            category: 'payment',
            type: 'debit',
            createdAt: { $gte: dayStart, $lte: dayEnd },
            stripePaymentIntentId: { $exists: true },
        }).lean();

        // ── 3. Build lookup maps ────────────────────────────────────────────────
        const stripeMap = new Map(stripePayments.map(p => [p.id, p]));
        const internalMap = new Map(
            internalEntries
                .filter(e => e.stripePaymentIntentId)
                .map(e => [e.stripePaymentIntentId!, e])
        );

        const mismatches: Array<{
            stripeId: string;
            stripeAmount: number;
            internalAmount?: number;
            type: 'missing_in_db' | 'amount_mismatch' | 'extra_in_db';
            description: string;
        }> = [];

        // ── 4. Stripe → Internal: find missing or mismatched ───────────────────
        for (const [id, stripe] of stripeMap) {
            const internal = internalMap.get(id);
            if (!internal) {
                mismatches.push({
                    stripeId: id,
                    stripeAmount: stripe.amount,
                    type: 'missing_in_db',
                    description: `Stripe payment ${id} (₹${stripe.amount}) has no matching LedgerEntry`,
                });
            } else if (Math.abs(internal.amount - stripe.amount) > 0.01) {
                mismatches.push({
                    stripeId: id,
                    stripeAmount: stripe.amount,
                    internalAmount: internal.amount,
                    type: 'amount_mismatch',
                    description: `Amount mismatch for ${id}: Stripe ₹${stripe.amount} vs DB ₹${internal.amount}`,
                });
            }
        }

        // ── 5. Internal → Stripe: find extra records ────────────────────────────
        for (const [id, entry] of internalMap) {
            if (!stripeMap.has(id)) {
                mismatches.push({
                    stripeId: id,
                    stripeAmount: 0,
                    internalAmount: entry.amount,
                    type: 'extra_in_db',
                    description: `LedgerEntry references ${id} but no matching Stripe payment found`,
                });
            }
        }

        // ── 6. Calculate totals ──────────────────────────────────────────────────
        const stripeTotalAmount = stripePayments.reduce((s, p) => s + p.amount, 0);
        const internalTotalAmount = internalEntries.reduce((s, e) => s + e.amount, 0);

        // ── 7. Upsert report ─────────────────────────────────────────────────────
        const status = mismatches.length === 0 ? 'clean' : 'mismatches_found';
        await ReconciliationReport.findOneAndUpdate(
            { date: dayStart },
            {
                stripeTransactionCount: stripePayments.length,
                internalTransactionCount: internalEntries.length,
                stripeTotalAmount,
                internalTotalAmount,
                mismatches,
                mismatchCount: mismatches.length,
                status,
                runAt: new Date(),
                durationMs: Date.now() - startTime,
            },
            { upsert: true, new: true }
        );

        if (mismatches.length > 0) {
            logger.warn(`Reconciliation found ${mismatches.length} mismatches`, {
                date: dayStart.toISOString(),
                stripeTotalAmount,
                internalTotalAmount,
            });
            if (Sentry) {
                Sentry.captureMessage('Stripe reconciliation mismatches detected', {
                    level: 'warning',
                    extra: { date: dayStart.toISOString(), mismatchCount: mismatches.length },
                });
            }
        } else {
            logger.info('Reconciliation clean', { date: dayStart.toISOString(), transactionCount: stripePayments.length });
        }
    } catch (err: any) {
        await ReconciliationReport.findOneAndUpdate(
            { date: dayStart },
            {
                status: 'error',
                errorMessage: err.message,
                runAt: new Date(),
                durationMs: Date.now() - startTime,
            },
            { upsert: true }
        );
        logger.error('Reconciliation failed', { error: err.message, stack: err.stack });
        Sentry?.captureException(err);
    }
};

const getYesterday = (): Date => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
};

/**
 * Get last N reconciliation reports.
 */
export const getRecentReports = async (days = 7) => {
    return ReconciliationReport.find()
        .sort({ date: -1 })
        .limit(days)
        .lean();
};

/**
 * Initialize daily cron (runs at 02:00 UTC every day).
 * Call once on server start.
 */
export const startReconciliationCron = (): void => {
    const scheduleNextRun = () => {
        const now = new Date();
        const nextRun = new Date();
        nextRun.setUTCHours(2, 0, 0, 0);
        if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
        const msUntilRun = nextRun.getTime() - now.getTime();
        logger.info(`Reconciliation cron scheduled — next run in ${Math.round(msUntilRun / 60000)} min`);
        setTimeout(async () => {
            await runReconciliation();
            scheduleNextRun(); // re-schedule for next day
        }, msUntilRun);
    };
    scheduleNextRun();
};
