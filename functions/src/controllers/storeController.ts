import { Request, Response } from 'express';
import { db } from '../config/firebase';

/**
 * @route   GET /api/stores (public)
 */
export const getStores = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status = 'approved', category, zone } = req.query;
        let query: FirebaseFirestore.Query = db.collection('stores');

        if (status !== 'all') query = query.where('status', '==', status);
        if (category) query = query.where('category', '==', category);
        if (zone) query = query.where('zone', '==', zone);

        const snap = await query.get();
        const stores = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        res.json(stores);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/stores/:id
 */
export const getStoreById = async (req: Request, res: Response): Promise<void> => {
    try {
        const doc = await db.collection('stores').doc(req.params.id as string).get();
        if (!doc.exists) {
            res.status(404).json({ message: 'Store not found' });
            return;
        }
        res.json({ _id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/vendor/store
 */
export const getMyStore = async (req: Request, res: Response): Promise<void> => {
    try {
        if (req.store) {
            res.json({ _id: req.store.id, ...req.store });
        } else {
            res.status(404).json({ message: 'No store found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/vendor/store
 */
export const updateMyStore = async (req: Request, res: Response): Promise<void> => {
    try {
        const storeId = req.store!.id;
        const updates = { ...req.body, updatedAt: new Date() };
        await db.collection('stores').doc(storeId).update(updates);

        const updated = await db.collection('stores').doc(storeId).get();
        res.json({ _id: updated.id, ...updated.data() });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
