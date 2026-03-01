import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { groupItemsByStore, createChildOrders, syncParentStatus } from '../utils/orderSplitter';

/**
 * @route   POST /api/orders
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { deliveryAddress, notes = '', orderType = 'delivery' } = req.body;

        if (!['delivery', 'takeaway'].includes(orderType)) {
            res.status(400).json({ message: 'Order type must be "delivery" or "takeaway"' });
            return;
        }

        if (orderType === 'delivery' && !deliveryAddress) {
            res.status(400).json({ message: 'Delivery address is required for delivery orders' });
            return;
        }

        // Get user's cart
        const cartDoc = await db.collection('carts').doc(req.user!.uid).get();
        if (!cartDoc.exists || !cartDoc.data()!.items?.length) {
            res.status(400).json({ message: 'Cart is empty' });
            return;
        }

        const cartItems = cartDoc.data()!.items;

        // Validate inventory
        for (const item of cartItems) {
            const prodDoc = await db.collection('products').doc(item.product).get();
            if (!prodDoc.exists) {
                res.status(400).json({ message: `Product ${item.product} no longer exists` });
                return;
            }
            if (prodDoc.data()!.inventory < item.quantity) {
                res.status(400).json({
                    message: `Insufficient inventory for "${prodDoc.data()!.name}". Available: ${prodDoc.data()!.inventory}, Requested: ${item.quantity}`,
                });
                return;
            }
        }

        // Group items by store
        const groupedItems = await groupItemsByStore(cartItems);

        // Calculate overall total
        let overallTotal = 0;
        for (const items of groupedItems.values()) {
            overallTotal += items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        }

        // Build items with names for parent order
        const itemsWithNames = await Promise.all(cartItems.map(async (item: any) => {
            const prodDoc = await db.collection('products').doc(item.product).get();
            return {
                product: item.product,
                name: prodDoc.exists ? prodDoc.data()!.name : 'Unknown Product',
                price: item.priceAtAdd,
                quantity: item.quantity,
            };
        }));

        // Generate order number
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const orderNumber = `ORD-${dateStr}-${random}`;

        // Create parent order
        const parentRef = db.collection('orders').doc();
        const parentData = {
            orderNumber,
            user: req.user!.uid,
            type: 'parent',
            items: itemsWithNames,
            subtotal: overallTotal,
            commission: 0,
            total: overallTotal,
            status: 'pending',
            paymentStatus: 'paid',
            deliveryAddress: orderType === 'delivery' ? deliveryAddress : 'Self Pickup',
            notes,
            orderType,
            deliveryFee: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await parentRef.set(parentData);

        // Create child orders
        const childOrders = await createChildOrders(
            req.user!.uid,
            parentRef.id,
            groupedItems,
            orderType === 'delivery' ? deliveryAddress : 'Self Pickup',
            notes,
            orderType
        );

        // Decrement inventory
        for (const item of cartItems) {
            const prodRef = db.collection('products').doc(item.product);
            await db.runTransaction(async (t) => {
                const doc = await t.get(prodRef);
                if (doc.exists) {
                    t.update(prodRef, {
                        inventory: (doc.data()!.inventory || 0) - item.quantity,
                        updatedAt: new Date(),
                    });
                }
            });
        }

        // Clear cart
        await db.collection('carts').doc(req.user!.uid).update({ items: [], updatedAt: new Date() });

        res.status(201).json({
            parentOrder: { _id: parentRef.id, ...parentData },
            childOrders,
            message: `Order placed successfully! Split into ${childOrders.length} vendor order(s).`,
        });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   GET /api/orders/my
 */
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const snap = await db.collection('orders')
            .where('user', '==', req.user!.uid)
            .where('type', '==', 'parent')
            .orderBy('createdAt', 'desc')
            .get();

        const ordersWithChildren = await Promise.all(snap.docs.map(async (doc) => {
            const data = doc.data();
            const childSnap = await db.collection('orders')
                .where('parentOrder', '==', doc.id)
                .get();

            const children = await Promise.all(childSnap.docs.map(async (cd) => {
                const cData = cd.data();
                let storeName = null;
                if (cData.store) {
                    const storeDoc = await db.collection('stores').doc(cData.store).get();
                    if (storeDoc.exists) storeName = storeDoc.data()!.name;
                }
                return { _id: cd.id, ...cData, store: cData.store ? { _id: cData.store, name: storeName } : null };
            }));

            return { _id: doc.id, ...data, childOrders: children };
        }));

        res.json(ordersWithChildren);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/orders/:id
 */
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
        const doc = await db.collection('orders').doc(req.params.id as string).get();
        if (!doc.exists) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        const data = doc.data()!;

        // Check access
        const userId = req.user!.uid;
        const isOwner = data.user === userId;
        const isVendor = req.user!.role === 'shopkeeper' && req.store && data.store === req.store.id;
        const isAdmin = req.user!.role === 'admin';

        if (!isOwner && !isVendor && !isAdmin) {
            res.status(403).json({ message: 'Not authorized to view this order' });
            return;
        }

        const responseData: any = { _id: doc.id, ...data };

        // Look up delivery
        const deliverySnap = await db.collection('deliveries')
            .where('order', '==', doc.id)
            .limit(1)
            .get();

        if (!deliverySnap.empty) {
            const delData = deliverySnap.docs[0].data();
            let driverName = null;
            if (delData.driver) {
                const driverDoc = await db.collection('users').doc(delData.driver).get();
                if (driverDoc.exists) driverName = driverDoc.data()!.name;
            }
            responseData.delivery = {
                _id: deliverySnap.docs[0].id,
                status: delData.status,
                driverName,
                pickupAddress: delData.pickupAddress,
                deliveryAddress: delData.deliveryAddress,
                deliveryFee: delData.deliveryFee,
                estimatedTime: delData.estimatedTime,
            };
        }

        // If parent order, include children
        if (data.type === 'parent') {
            const childSnap = await db.collection('orders')
                .where('parentOrder', '==', doc.id)
                .get();

            responseData.childOrders = await Promise.all(childSnap.docs.map(async (cd) => {
                const cData = cd.data();
                let storeName = null;
                if (cData.store) {
                    const storeDoc = await db.collection('stores').doc(cData.store).get();
                    if (storeDoc.exists) storeName = storeDoc.data()!.name;
                }
                return { _id: cd.id, ...cData, store: cData.store ? { _id: cData.store, name: storeName } : null };
            }));
        }

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/vendor/orders
 */
export const getVendorOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.query;
        let query: FirebaseFirestore.Query = db.collection('orders')
            .where('store', '==', req.store!.id)
            .where('type', '==', 'child');

        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snap = await query.orderBy('createdAt', 'desc').get();

        const orders = await Promise.all(snap.docs.map(async (doc) => {
            const data = doc.data();
            let userInfo = null;
            if (data.user) {
                const userDoc = await db.collection('users').doc(data.user).get();
                if (userDoc.exists) {
                    userInfo = { _id: userDoc.id, name: userDoc.data()!.name, email: userDoc.data()!.email };
                }
            }
            return { _id: doc.id, ...data, user: userInfo };
        }));

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   PUT /api/vendor/orders/:id/status
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.body;
        const validStatuses = ['confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'];

        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            return;
        }

        const doc = await db.collection('orders').doc(req.params.id as string).get();
        if (!doc.exists || doc.data()!.store !== req.store!.id || doc.data()!.type !== 'child') {
            res.status(404).json({ message: 'Order not found or does not belong to your store' });
            return;
        }

        await db.collection('orders').doc(req.params.id as string).update({
            status,
            updatedAt: new Date(),
        });

        // Sync parent order status
        const data = doc.data()!;
        if (data.parentOrder) {
            await syncParentStatus(data.parentOrder);
        }

        res.json({ message: `Order status updated to '${status}'` });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/admin/orders
 */
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type = 'parent', status } = req.query;
        let query: FirebaseFirestore.Query = db.collection('orders');

        if (type) query = query.where('type', '==', type);
        if (status && status !== 'all') query = query.where('status', '==', status);

        const snap = await query.orderBy('createdAt', 'desc').get();

        const orders = await Promise.all(snap.docs.map(async (doc) => {
            const data = doc.data();
            let userInfo = null;
            if (data.user) {
                const userDoc = await db.collection('users').doc(data.user).get();
                if (userDoc.exists) {
                    userInfo = { _id: userDoc.id, name: userDoc.data()!.name, email: userDoc.data()!.email };
                }
            }
            let storeInfo = null;
            if (data.store) {
                const storeDoc = await db.collection('stores').doc(data.store).get();
                if (storeDoc.exists) {
                    storeInfo = { _id: storeDoc.id, name: storeDoc.data()!.name };
                }
            }
            return { _id: doc.id, ...data, user: userInfo, store: storeInfo };
        }));

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
