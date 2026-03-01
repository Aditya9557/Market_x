import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { createLedgerEntry } from '../services/walletService';

/**
 * Dispute Service & Controller — Firestore-based
 */

interface CreateDisputeParams {
    userId: string;
    orderId: string;
    reason: string;
    description: string;
}

export const createDisputeInDB = async (params: CreateDisputeParams) => {
    const orderDoc = await db.collection('orders').doc(params.orderId).get();
    if (!orderDoc.exists) throw new Error('Order not found');

    const order = orderDoc.data()!;
    if (order.user !== params.userId) throw new Error('You can only dispute your own orders');

    // Check for existing open dispute
    const existingSnap = await db.collection('disputes')
        .where('order', '==', params.orderId)
        .where('status', 'in', ['open', 'under_review'])
        .limit(1)
        .get();

    if (!existingSnap.empty) throw new Error('A dispute is already open for this order');

    const ref = db.collection('disputes').doc();
    const disputeData = {
        order: params.orderId,
        user: params.userId,
        store: order.store || null,
        heroId: order.heroId || null,
        reason: params.reason,
        description: params.description,
        status: 'open',
        resolution: null,
        adminNotes: null,
        resolvedBy: null,
        resolvedAt: null,
        refundAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await ref.set(disputeData);
    return { _id: ref.id, ...disputeData };
};

interface ResolveDisputeParams {
    disputeId: string;
    adminId: string;
    resolution: string;
    adminNotes?: string;
    refundAmount?: number;
}

export const resolveDisputeInDB = async (params: ResolveDisputeParams) => {
    return db.runTransaction(async (t) => {
        const disputeRef = db.collection('disputes').doc(params.disputeId);
        const disputeDoc = await t.get(disputeRef);

        if (!disputeDoc.exists) throw new Error('Dispute not found');
        const dispute = disputeDoc.data()!;

        if (dispute.status === 'resolved' || dispute.status === 'rejected') {
            throw new Error('Dispute is already resolved');
        }

        const orderDoc = await t.get(db.collection('orders').doc(dispute.order));
        if (!orderDoc.exists) throw new Error('Associated order not found');
        const order = orderDoc.data()!;

        let creditAmount = 0;
        if (params.resolution === 'refund_full') {
            creditAmount = order.total;
        } else if (params.resolution === 'refund_partial' || params.resolution === 'wallet_credit') {
            creditAmount = params.refundAmount || 0;
            if (creditAmount <= 0) throw new Error('Refund amount must be positive');
            if (creditAmount > order.total) throw new Error('Refund amount cannot exceed order total');
        }

        const newStatus = params.resolution === 'rejected' ? 'rejected' : 'resolved';

        t.update(disputeRef, {
            resolution: params.resolution,
            adminNotes: params.adminNotes || null,
            resolvedBy: params.adminId,
            resolvedAt: new Date(),
            refundAmount: creditAmount,
            status: newStatus,
            updatedAt: new Date(),
        });

        return { disputeId: params.disputeId, creditAmount, userId: dispute.user };
    }).then(async (result) => {
        // Credit wallet outside of transaction (createLedgerEntry runs its own transaction)
        if (result.creditAmount > 0) {
            await createLedgerEntry({
                userId: result.userId,
                type: 'credit',
                amount: result.creditAmount,
                category: 'dispute_credit',
                reference: `Dispute resolution #${result.disputeId}`,
                disputeId: result.disputeId,
            });
        }
        return result;
    });
};

// ── Controller Handlers ─────────────────────────────

export const fileDispute = async (req: Request, res: Response): Promise<void> => {
    try {
        const dispute = await createDisputeInDB({
            userId: req.user!.uid,
            orderId: req.body.orderId,
            reason: req.body.reason,
            description: req.body.description,
        });
        res.status(201).json({ message: 'Dispute filed successfully.', dispute });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        const status = errMsg.includes('already open') ? 409 : errMsg.includes('not found') ? 404 : 400;
        res.status(status).json({ message: errMsg });
    }
};

export const getMyDisputes = async (req: Request, res: Response): Promise<void> => {
    try {
        const snap = await db.collection('disputes')
            .where('user', '==', req.user!.uid)
            .orderBy('createdAt', 'desc')
            .get();

        const disputes = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
        res.json({ disputes, total: disputes.length });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getDisputes = async (req: Request, res: Response): Promise<void> => {
    try {
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        let query: FirebaseFirestore.Query = db.collection('disputes');
        if (status) query = query.where('status', '==', status);

        const snap = await query.orderBy('createdAt', 'desc').get();

        const disputes = await Promise.all(snap.docs.map(async (doc) => {
            const d = doc.data();
            let userInfo = null;
            if (d.user) {
                const u = await db.collection('users').doc(d.user).get();
                if (u.exists) userInfo = { _id: u.id, name: u.data()!.name, email: u.data()!.email };
            }
            let orderInfo = null;
            if (d.order) {
                const o = await db.collection('orders').doc(d.order).get();
                if (o.exists) orderInfo = { _id: o.id, orderNumber: o.data()!.orderNumber, total: o.data()!.total };
            }
            return { _id: doc.id, ...d, user: userInfo, order: orderInfo };
        }));

        res.json({ disputes, total: disputes.length });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const resolveDispute = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await resolveDisputeInDB({
            disputeId: req.params.id as string,
            adminId: req.user!.uid,
            resolution: req.body.resolution,
            adminNotes: req.body.adminNotes,
            refundAmount: req.body.refundAmount,
        });
        res.json({ message: `Dispute resolved: ${req.body.resolution}`, result });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        const status = errMsg.includes('not found') ? 404 : errMsg.includes('already') ? 409 : 400;
        res.status(status).json({ message: errMsg });
    }
};
