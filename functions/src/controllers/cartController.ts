import { Request, Response } from 'express';
import { db } from '../config/firebase';

/**
 * @route   GET /api/cart
 */
export const getCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const cartDoc = await db.collection('carts').doc(req.user!.uid).get();

        if (!cartDoc.exists) {
            await db.collection('carts').doc(req.user!.uid).set({
                user: req.user!.uid,
                items: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            res.json({ _id: req.user!.uid, user: req.user!.uid, items: [] });
            return;
        }

        const cartData = cartDoc.data()!;

        // Populate product data for each item
        const populatedItems = await Promise.all(
            (cartData.items || []).map(async (item: any) => {
                const prodDoc = await db.collection('products').doc(item.product).get();
                if (!prodDoc.exists) return { ...item, product: null };
                const prodData = prodDoc.data()!;

                // Get store info
                let storeInfo = null;
                if (prodData.store) {
                    const storeDoc = await db.collection('stores').doc(prodData.store).get();
                    if (storeDoc.exists) {
                        storeInfo = { _id: storeDoc.id, name: storeDoc.data()!.name, status: storeDoc.data()!.status };
                    }
                }

                return {
                    ...item,
                    product: {
                        _id: prodDoc.id,
                        name: prodData.name,
                        price: prodData.price,
                        images: prodData.images || [],
                        inventory: prodData.inventory,
                        store: storeInfo,
                        status: prodData.status,
                    },
                };
            })
        );

        res.json({ _id: cartDoc.id, ...cartData, items: populatedItems });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   POST /api/cart/add
 */
export const addToCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            res.status(400).json({ message: 'productId is required' });
            return;
        }

        // Validate product
        const prodDoc = await db.collection('products').doc(productId).get();
        if (!prodDoc.exists || prodDoc.data()!.status !== 'active') {
            res.status(404).json({ message: 'Product not found or unavailable' });
            return;
        }

        const product = prodDoc.data()!;

        // Validate store
        const storeDoc = await db.collection('stores').doc(product.store).get();
        if (!storeDoc.exists || storeDoc.data()!.status !== 'approved') {
            res.status(400).json({ message: "This product's store is not currently available" });
            return;
        }

        if (product.inventory < quantity) {
            res.status(400).json({ message: `Only ${product.inventory} items available in stock` });
            return;
        }

        // Get or create cart
        const cartRef = db.collection('carts').doc(req.user!.uid);
        const cartDoc = await cartRef.get();

        let items: any[] = [];
        if (cartDoc.exists) {
            items = cartDoc.data()!.items || [];
        }

        // Check if product already in cart
        const existingIndex = items.findIndex((item: any) => item.product === productId);
        if (existingIndex >= 0) {
            items[existingIndex].quantity += quantity;
            items[existingIndex].priceAtAdd = product.price;
        } else {
            items.push({
                product: productId,
                quantity,
                priceAtAdd: product.price,
            });
        }

        await cartRef.set({
            user: req.user!.uid,
            items,
            updatedAt: new Date(),
            ...(cartDoc.exists ? {} : { createdAt: new Date() }),
        }, { merge: true });

        // Return populated cart
        const updatedCart = await cartRef.get();
        res.json({ _id: updatedCart.id, ...updatedCart.data() });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/cart/update
 */
export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || quantity === undefined) {
            res.status(400).json({ message: 'productId and quantity are required' });
            return;
        }

        const cartRef = db.collection('carts').doc(req.user!.uid);
        const cartDoc = await cartRef.get();
        if (!cartDoc.exists) {
            res.status(404).json({ message: 'Cart not found' });
            return;
        }

        let items = cartDoc.data()!.items || [];
        const itemIndex = items.findIndex((item: any) => item.product === productId);

        if (itemIndex < 0) {
            res.status(404).json({ message: 'Item not found in cart' });
            return;
        }

        if (quantity <= 0) {
            items = items.filter((item: any) => item.product !== productId);
        } else {
            const prodDoc = await db.collection('products').doc(productId).get();
            if (prodDoc.exists && prodDoc.data()!.inventory < quantity) {
                res.status(400).json({ message: `Only ${prodDoc.data()!.inventory} items available in stock` });
                return;
            }
            items[itemIndex].quantity = quantity;
        }

        await cartRef.update({ items, updatedAt: new Date() });
        res.json({ _id: cartRef.id, items });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   DELETE /api/cart/remove/:productId
 */
export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const productId = req.params.productId as string;
        const cartRef = db.collection('carts').doc(req.user!.uid);
        const cartDoc = await cartRef.get();

        if (!cartDoc.exists) {
            res.status(404).json({ message: 'Cart not found' });
            return;
        }

        const items = (cartDoc.data()!.items || []).filter((item: any) => item.product !== productId);
        await cartRef.update({ items, updatedAt: new Date() });
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   DELETE /api/cart/clear
 */
export const clearCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const cartRef = db.collection('carts').doc(req.user!.uid);
        await cartRef.set({
            user: req.user!.uid,
            items: [],
            updatedAt: new Date(),
        }, { merge: true });
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
