import { Request, Response } from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';
import Store from '../models/Store';

/**
 * @route   GET /api/cart
 * @desc    Get the current user's cart (student only)
 */
export const getCart = async (req: Request, res: Response): Promise<void> => {
    try {
        let cart = await Cart.findOne({ user: req.user!._id })
            .populate({
                path: 'items.product',
                select: 'name price images inventory store status',
                populate: { path: 'store', select: 'name status' }
            });

        if (!cart) {
            cart = await Cart.create({ user: req.user!._id, items: [] });
        }

        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   POST /api/cart/add
 * @desc    Add a product to cart (student only)
 */
export const addToCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            res.status(400).json({ message: 'productId is required' });
            return;
        }

        // Validate the product exists, is active, and from an approved store
        const product = await Product.findById(productId);
        if (!product || product.status !== 'active') {
            res.status(404).json({ message: 'Product not found or unavailable' });
            return;
        }

        const store = await Store.findById(product.store);
        if (!store || store.status !== 'approved') {
            res.status(400).json({ message: 'This product\'s store is not currently available' });
            return;
        }

        if (product.inventory < quantity) {
            res.status(400).json({ message: `Only ${product.inventory} items available in stock` });
            return;
        }

        let cart = await Cart.findOne({ user: req.user!._id });
        if (!cart) {
            cart = await Cart.create({ user: req.user!._id, items: [] });
        }

        // Check if product already in cart
        const existingItem = cart.items.find(
            item => item.product.toString() === productId
        );

        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.priceAtAdd = product.price;
        } else {
            cart.items.push({
                product: productId,
                quantity,
                priceAtAdd: product.price
            });
        }

        await cart.save();

        // Return populated cart
        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.product',
                select: 'name price images inventory store status',
                populate: { path: 'store', select: 'name status' }
            });

        res.json(populatedCart);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/cart/update
 * @desc    Update item quantity in cart (student only)
 */
export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || quantity === undefined) {
            res.status(400).json({ message: 'productId and quantity are required' });
            return;
        }

        const cart = await Cart.findOne({ user: req.user!._id });
        if (!cart) {
            res.status(404).json({ message: 'Cart not found' });
            return;
        }

        const item = cart.items.find(
            item => item.product.toString() === productId
        );

        if (!item) {
            res.status(404).json({ message: 'Item not found in cart' });
            return;
        }

        if (quantity <= 0) {
            cart.items = cart.items.filter(
                item => item.product.toString() !== productId
            );
        } else {
            // Validate inventory
            const product = await Product.findById(productId);
            if (product && product.inventory < quantity) {
                res.status(400).json({ message: `Only ${product.inventory} items available in stock` });
                return;
            }
            item.quantity = quantity;
        }

        await cart.save();

        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.product',
                select: 'name price images inventory store status',
                populate: { path: 'store', select: 'name status' }
            });

        res.json(populatedCart);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   DELETE /api/cart/remove/:productId
 * @desc    Remove an item from cart (student only)
 */
export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: req.user!._id });
        if (!cart) {
            res.status(404).json({ message: 'Cart not found' });
            return;
        }

        cart.items = cart.items.filter(
            item => item.product.toString() !== productId
        );

        await cart.save();
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear the entire cart (student only)
 */
export const clearCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const cart = await Cart.findOne({ user: req.user!._id });
        if (cart) {
            cart.items = [];
            await cart.save();
        }

        res.json({ message: 'Cart cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
