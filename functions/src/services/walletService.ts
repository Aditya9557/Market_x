import { db } from '../config/firebase';
import admin from '../config/firebase';

/**
 * Wallet Ledger Service — Firestore-based.
 * Uses Firestore transactions for atomic balance + ledger writes.
 */

interface LedgerParams {
    userId: string;
    type: 'credit' | 'debit';
    amount: number;
    category: string;
    reference: string;
    orderId?: string;
    disputeId?: string;
    stripePaymentIntentId?: string;
    razorpayPaymentId?: string;
    metadata?: Record<string, any>;
}

export const createLedgerEntry = async (params: LedgerParams): Promise<any> => {
    const userRef = db.collection('users').doc(params.userId);
    const ledgerRef = db.collection('ledgerEntries').doc();

    return db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) throw new Error('User not found');

        const currentBalance = userDoc.data()!.walletBalance || 0;
        const newBalance = params.type === 'credit'
            ? currentBalance + params.amount
            : currentBalance - params.amount;

        if (params.type === 'debit' && newBalance < 0) {
            throw new Error('Insufficient wallet balance');
        }

        const entryData = {
            user: params.userId,
            type: params.type,
            amount: params.amount,
            balanceAfter: newBalance,
            category: params.category,
            reference: params.reference,
            orderId: params.orderId || null,
            disputeId: params.disputeId || null,
            stripePaymentIntentId: params.stripePaymentIntentId || null,
            razorpayPaymentId: params.razorpayPaymentId || null,
            metadata: params.metadata || {},
            createdAt: new Date(),
        };

        t.set(ledgerRef, entryData);
        t.update(userRef, { walletBalance: newBalance, updatedAt: new Date() });

        console.log(`Ledger: ${params.type} ₹${params.amount} for user ${params.userId} — ${params.reference}`);
        return { id: ledgerRef.id, ...entryData };
    });
};

export const getLedgerHistory = async (userId: string, page = 1, limit = 20) => {
    const snap = await db.collection('ledgerEntries')
        .where('user', '==', userId)
        .orderBy('createdAt', 'desc')
        .offset((page - 1) * limit)
        .limit(limit)
        .get();

    const entries = snap.docs.map(d => ({ _id: d.id, ...d.data() }));

    const countSnap = await db.collection('ledgerEntries')
        .where('user', '==', userId)
        .count()
        .get();
    const total = countSnap.data().count;

    return { entries, total, page, pages: Math.ceil(total / limit) };
};

export const reconcileBalance = async (userId: string) => {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) throw new Error('User not found');

    const snap = await db.collection('ledgerEntries')
        .where('user', '==', userId)
        .get();

    let totalCredits = 0;
    let totalDebits = 0;
    snap.docs.forEach(d => {
        const data = d.data();
        if (data.type === 'credit') totalCredits += data.amount;
        else totalDebits += data.amount;
    });

    const ledgerBalance = totalCredits - totalDebits;
    const walletBalance = userDoc.data()!.walletBalance || 0;
    const isConsistent = Math.abs(walletBalance - ledgerBalance) < 0.01;

    if (!isConsistent) {
        console.warn(`Wallet reconciliation mismatch for user ${userId}: wallet=${walletBalance}, ledger=${ledgerBalance}`);
    }

    return { walletBalance, ledgerBalance, isConsistent };
};
