import { Request, Response } from 'express';
import User from '../models/User';
import Store from '../models/Store';

/**
 * @route   GET /api/admin/pending-shops
 * @desc    Get all pending shopkeeper applications
 */
export const getPendingShops = async (req: Request, res: Response): Promise<void> => {
    try {
        const shops = await User.find({ role: 'shopkeeper', status: 'pending' })
            .select('-password')
            .populate('store', 'name status category description');
        res.json(shops);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/admin/all-stores
 * @desc    Get all stores with any status (admin overview)
 */
export const getAllStores = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.query;
        const filter: any = {};
        if (status && status !== 'all') filter.status = status;

        const stores = await Store.find(filter)
            .populate('owner', 'name email')
            .sort({ createdAt: -1 });

        res.json(stores);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/approve-shop/:id
 * @desc    Approve a shopkeeper and their store
 */
export const approveShop = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const shop = await User.findById(id);
        if (!shop || shop.role !== 'shopkeeper') {
            res.status(404).json({ message: 'Shop not found' });
            return;
        }

        // Update user status
        shop.status = 'active';
        await shop.save();

        // Also update the Store entity status
        if (shop.store) {
            await Store.findByIdAndUpdate(shop.store, { status: 'approved' });
        }

        res.json({ message: 'Shop approved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/reject-shop/:id
 * @desc    Reject a shopkeeper and their store
 */
export const rejectShop = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const shop = await User.findById(id);
        if (!shop || shop.role !== 'shopkeeper') {
            res.status(404).json({ message: 'Shop not found' });
            return;
        }

        // Update user status
        shop.status = 'rejected';
        await shop.save();

        // Also update the Store entity status
        if (shop.store) {
            await Store.findByIdAndUpdate(shop.store, { status: 'rejected' });
        }

        res.json({ message: 'Shop rejected successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/uniguide-toggle/:storeId
 * @desc    Toggle approvedForUniGuide for a store
 */
export const toggleUniGuideApproval = async (req: Request, res: Response): Promise<void> => {
    try {
        const store = await Store.findById(req.params.storeId);
        if (!store) {
            res.status(404).json({ message: 'Store not found' });
            return;
        }

        store.approvedForUniGuide = !store.approvedForUniGuide;
        await store.save();

        res.json({
            message: store.approvedForUniGuide
                ? 'Store approved for Uni Guide ✅'
                : 'Store removed from Uni Guide ❌',
            approvedForUniGuide: store.approvedForUniGuide
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
