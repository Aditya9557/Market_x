import { Request, Response } from 'express';
import Store from '../models/Store';

/**
 * @route   GET /api/stores
 * @desc    List all approved stores (public, for student browsing)
 */
export const getApprovedStores = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, search } = req.query;
        const filter: any = { status: 'approved' };

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const stores = await Store.find(filter)
            .select('-stripeAccountId -commissionRate')
            .populate('owner', 'name email')
            .sort({ createdAt: -1 });

        res.json(stores);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/stores/:id
 * @desc    Get single store details (public)
 */
export const getStoreById = async (req: Request, res: Response): Promise<void> => {
    try {
        const store = await Store.findOne({ _id: req.params.id, status: 'approved' })
            .select('-stripeAccountId -commissionRate')
            .populate('owner', 'name email');

        if (!store) {
            res.status(404).json({ message: 'Store not found' });
            return;
        }

        res.json(store);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/vendor/store
 * @desc    Get own store (vendor only, via storeScope middleware)
 */
export const getOwnStore = async (req: Request, res: Response): Promise<void> => {
    try {
        res.json(req.store);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/vendor/store
 * @desc    Update own store settings (vendor only)
 */
export const updateOwnStore = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description, category, settings, images, zone, openForUniGuide } = req.body;

        const store = req.store!;
        if (name) store.name = name;
        if (description !== undefined) store.description = description;
        if (category) store.category = category;
        if (settings) {
            store.settings = { ...store.settings, ...settings };
        }
        if (images) store.images = images;
        if (zone) store.zone = zone;
        if (openForUniGuide !== undefined) store.openForUniGuide = openForUniGuide;

        await store.save();
        res.json(store);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
