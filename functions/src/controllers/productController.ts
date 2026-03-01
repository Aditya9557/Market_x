import { Request, Response } from 'express';
import { db } from '../config/firebase';

/**
 * @route   GET /api/products (public)
 */
export const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { store, category, status = 'active', search } = req.query;
        let query: FirebaseFirestore.Query = db.collection('products');

        if (store) query = query.where('store', '==', store);
        if (category) query = query.where('category', '==', category);
        if (status !== 'all') query = query.where('status', '==', status);

        const snap = await query.get();
        let products = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));

        // Client-side text search (Firestore doesn't have native full-text search)
        if (search && typeof search === 'string') {
            const searchLower = search.toLowerCase();
            products = products.filter((p: any) =>
                p.name?.toLowerCase().includes(searchLower) ||
                p.description?.toLowerCase().includes(searchLower) ||
                p.tags?.some((t: string) => t.toLowerCase().includes(searchLower))
            );
        }

        // Populate store names
        const storeIds = [...new Set(products.map((p: any) => p.store).filter(Boolean))];
        const storeMap = new Map<string, any>();
        for (const sid of storeIds) {
            const storeDoc = await db.collection('stores').doc(sid as string).get();
            if (storeDoc.exists) storeMap.set(sid as string, { _id: storeDoc.id, name: storeDoc.data()!.name, status: storeDoc.data()!.status });
        }

        const enriched = products.map((p: any) => ({
            ...p,
            storeInfo: storeMap.get(p.store) || null,
        }));

        res.json(enriched);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/products/:id
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        const doc = await db.collection('products').doc(req.params.id as string).get();
        if (!doc.exists) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }
        res.json({ _id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   POST /api/vendor/products
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const storeId = req.store!.id;
        const ref = db.collection('products').doc();
        const productData = {
            ...req.body,
            store: storeId,
            status: 'active',
            images: req.body.images || [],
            tags: req.body.tags || [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await ref.set(productData);
        res.status(201).json({ _id: ref.id, ...productData });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/vendor/products/:id
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const doc = await db.collection('products').doc(req.params.id as string).get();
        if (!doc.exists) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        // Ensure product belongs to this vendor's store
        if (doc.data()!.store !== req.store!.id) {
            res.status(403).json({ message: 'Not authorized to update this product' });
            return;
        }

        await db.collection('products').doc(req.params.id as string).update({
            ...req.body,
            updatedAt: new Date(),
        });

        const updated = await db.collection('products').doc(req.params.id as string).get();
        res.json({ _id: updated.id, ...updated.data() });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   DELETE /api/vendor/products/:id
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const doc = await db.collection('products').doc(req.params.id as string).get();
        if (!doc.exists) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        if (doc.data()!.store !== req.store!.id) {
            res.status(403).json({ message: 'Not authorized to delete this product' });
            return;
        }

        await db.collection('products').doc(req.params.id as string).update({
            status: 'archived',
            updatedAt: new Date(),
        });

        res.json({ message: 'Product archived' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
