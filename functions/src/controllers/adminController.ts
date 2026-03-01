import { Request, Response } from 'express';
import { db, auth } from '../config/firebase';

/**
 * @route   GET /api/admin/pending-shops
 */
export const getPendingShops = async (req: Request, res: Response): Promise<void> => {
    try {
        const usersSnap = await db.collection('users')
            .where('role', '==', 'shopkeeper')
            .where('status', '==', 'pending')
            .get();

        const shops = await Promise.all(usersSnap.docs.map(async (doc) => {
            const data = doc.data();
            let storeInfo = null;
            if (data.store) {
                const storeDoc = await db.collection('stores').doc(data.store).get();
                if (storeDoc.exists) {
                    const sd = storeDoc.data()!;
                    storeInfo = { _id: storeDoc.id, name: sd.name, status: sd.status, category: sd.category, description: sd.description };
                }
            }
            const { password, ...safeData } = data;
            return { _id: doc.id, ...safeData, store: storeInfo };
        }));

        res.json(shops);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/admin/all-stores
 */
export const getAllStores = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.query;
        let query: FirebaseFirestore.Query = db.collection('stores');
        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }

        const storesSnap = await query.orderBy('createdAt', 'desc').get();

        const stores = await Promise.all(storesSnap.docs.map(async (doc) => {
            const data = doc.data();
            let ownerInfo = null;
            if (data.owner) {
                const ownerDoc = await db.collection('users').doc(data.owner).get();
                if (ownerDoc.exists) {
                    const od = ownerDoc.data()!;
                    ownerInfo = { _id: ownerDoc.id, name: od.name, email: od.email };
                }
            }
            return { _id: doc.id, ...data, owner: ownerInfo };
        }));

        res.json(stores);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/approve-shop/:id
 */
export const approveShop = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    try {
        const userDoc = await db.collection('users').doc(id).get();
        if (!userDoc.exists || userDoc.data()!.role !== 'shopkeeper') {
            res.status(404).json({ message: 'Shop not found' });
            return;
        }

        // Update user status
        await db.collection('users').doc(id).update({ status: 'active', updatedAt: new Date() });

        // Update store status
        const userData = userDoc.data()!;
        if (userData.store) {
            await db.collection('stores').doc(userData.store).update({ status: 'approved', updatedAt: new Date() });
        }

        res.json({ message: 'Shop approved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/reject-shop/:id
 */
export const rejectShop = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    try {
        const userDoc = await db.collection('users').doc(id).get();
        if (!userDoc.exists || userDoc.data()!.role !== 'shopkeeper') {
            res.status(404).json({ message: 'Shop not found' });
            return;
        }

        await db.collection('users').doc(id).update({ status: 'rejected', updatedAt: new Date() });

        const userData = userDoc.data()!;
        if (userData.store) {
            await db.collection('stores').doc(userData.store).update({ status: 'rejected', updatedAt: new Date() });
        }

        res.json({ message: 'Shop rejected successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/uniguide-toggle/:storeId
 */
export const toggleUniGuideApproval = async (req: Request, res: Response): Promise<void> => {
    try {
        const storeDoc = await db.collection('stores').doc(req.params.storeId as string).get();
        if (!storeDoc.exists) {
            res.status(404).json({ message: 'Store not found' });
            return;
        }

        const currentValue = storeDoc.data()!.approvedForUniGuide || false;
        await db.collection('stores').doc(req.params.storeId as string).update({
            approvedForUniGuide: !currentValue,
            updatedAt: new Date(),
        });

        res.json({
            message: !currentValue
                ? 'Store approved for Uni Guide ✅'
                : 'Store removed from Uni Guide ❌',
            approvedForUniGuide: !currentValue,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
