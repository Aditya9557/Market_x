import { Request, Response } from 'express';
import Product from '../models/Product';
import Store from '../models/Store';

/**
 * @route   GET /api/products
 * @desc    Browse all products from approved stores (public)
 */
export const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, store, search, page = '1', limit = '20', storeType } = req.query;

        // First get all approved store IDs
        let storeFilter: any = { status: 'approved' };
        if (storeType && storeType !== 'all') storeFilter.storeType = storeType;

        const approvedStores = await Store.find(storeFilter).select('_id');
        const approvedStoreIds = approvedStores.map(s => s._id);

        const filter: any = {
            store: { $in: approvedStoreIds },
            status: 'active'
        };

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (store) {
            filter.store = store;
        }

        if (search) {
            filter.$text = { $search: search as string };
        }

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate('store', 'name category')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Product.countDocuments(filter)
        ]);

        res.json({
            products,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/products/:id
 * @desc    Get single product (public)
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            status: 'active'
        }).populate('store', 'name category settings');

        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        // Verify the product's store is approved
        const store = await Store.findById(product.store);
        if (!store || store.status !== 'approved') {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/vendor/products
 * @desc    List vendor's own products (vendor only)
 */
export const getVendorProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const products = await Product.find({ store: req.store!._id })
            .sort({ createdAt: -1 });

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   POST /api/vendor/products
 * @desc    Create a product (vendor only)
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description, price, compareAtPrice, inventory, category, images, tags, status } = req.body;

        if (!name || price === undefined) {
            res.status(400).json({ message: 'Name and price are required' });
            return;
        }

        const product = await Product.create({
            name,
            description,
            price,
            compareAtPrice,
            inventory: inventory || 0,
            category: category || 'other',
            images: images || [],
            store: req.store!._id,
            status: status || 'active',
            tags: tags || []
        });

        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   PUT /api/vendor/products/:id
 * @desc    Update own product (vendor only)
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            store: req.store!._id
        });

        if (!product) {
            res.status(404).json({ message: 'Product not found or does not belong to your store' });
            return;
        }

        const allowedFields = ['name', 'description', 'price', 'compareAtPrice', 'inventory', 'category', 'images', 'status', 'tags'];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                (product as any)[field] = req.body[field];
            }
        }

        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   DELETE /api/vendor/products/:id
 * @desc    Archive a product (soft delete, vendor only)
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            store: req.store!._id
        });

        if (!product) {
            res.status(404).json({ message: 'Product not found or does not belong to your store' });
            return;
        }

        product.status = 'archived';
        await product.save();
        res.json({ message: 'Product archived successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
