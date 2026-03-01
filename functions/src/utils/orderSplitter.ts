import { db } from '../config/firebase';

interface CartItem {
    product: string;    // Firestore doc ID
    quantity: number;
    priceAtAdd: number;
}

interface PopulatedCartItem {
    product: {
        id: string;
        name: string;
        price: number;
        store: string;
    };
    quantity: number;
    priceAtAdd: number;
}

/**
 * Groups cart items by their store ID.
 */
export async function groupItemsByStore(cartItems: CartItem[]): Promise<Map<string, PopulatedCartItem[]>> {
    const groups = new Map<string, PopulatedCartItem[]>();

    // Fetch all products in parallel
    const productDocs = await Promise.all(
        cartItems.map(item => db.collection('products').doc(item.product).get())
    );

    for (let i = 0; i < cartItems.length; i++) {
        const doc = productDocs[i];
        if (!doc.exists) continue;

        const product = doc.data()!;
        const storeId = product.store as string;

        const populated: PopulatedCartItem = {
            product: {
                id: doc.id,
                name: product.name,
                price: product.price,
                store: storeId,
            },
            quantity: cartItems[i].quantity,
            priceAtAdd: cartItems[i].priceAtAdd,
        };

        if (!groups.has(storeId)) {
            groups.set(storeId, []);
        }
        groups.get(storeId)!.push(populated);
    }

    return groups;
}

/**
 * Creates child orders for each vendor from grouped cart items.
 */
export async function createChildOrders(
    userId: string,
    parentOrderId: string,
    groupedItems: Map<string, PopulatedCartItem[]>,
    deliveryAddress: string,
    notes: string,
    orderType: 'delivery' | 'takeaway'
): Promise<any[]> {
    const childOrders = [];

    for (const [storeId, items] of groupedItems) {
        const storeDoc = await db.collection('stores').doc(storeId).get();
        const commissionRate = storeDoc.exists ? (storeDoc.data()!.commissionRate || 10) : 10;

        const subtotal = items.reduce((sum, item) => sum + (item.priceAtAdd * item.quantity), 0);
        const commission = Math.round(subtotal * commissionRate) / 100;
        const total = subtotal;

        // Generate order number
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const orderNumber = `ORD-${dateStr}-${random}`;

        const childRef = db.collection('orders').doc();
        const childData = {
            orderNumber,
            user: userId,
            type: 'child',
            parentOrder: parentOrderId,
            store: storeId,
            items: items.map(item => ({
                product: item.product.id,
                name: item.product.name,
                price: item.priceAtAdd,
                quantity: item.quantity,
            })),
            subtotal,
            commission,
            total,
            status: 'pending',
            paymentStatus: 'pending',
            deliveryAddress: orderType === 'delivery' ? deliveryAddress : 'Self Pickup',
            notes,
            orderType,
            deliveryFee: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await childRef.set(childData);
        childOrders.push({ id: childRef.id, ...childData });
    }

    return childOrders;
}

/**
 * Syncs parent order status based on all child order statuses.
 */
export async function syncParentStatus(parentOrderId: string): Promise<void> {
    const childSnap = await db.collection('orders')
        .where('parentOrder', '==', parentOrderId)
        .where('type', '==', 'child')
        .get();

    if (childSnap.empty) return;

    const statuses = childSnap.docs.map(d => d.data().status);

    let parentStatus: string;

    if (statuses.every(s => s === 'delivered')) {
        parentStatus = 'delivered';
    } else if (statuses.every(s => s === 'cancelled')) {
        parentStatus = 'cancelled';
    } else if (statuses.some(s => s === 'dispatched' || s === 'delivered')) {
        parentStatus = 'dispatched';
    } else if (statuses.some(s => s === 'preparing' || s === 'ready')) {
        parentStatus = 'preparing';
    } else if (statuses.some(s => s === 'confirmed')) {
        parentStatus = 'confirmed';
    } else {
        parentStatus = 'pending';
    }

    await db.collection('orders').doc(parentOrderId).update({
        status: parentStatus,
        updatedAt: new Date(),
    });
}
