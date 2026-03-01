import { Request, Response } from 'express';
import { db } from '../config/firebase';
import {
    generateAndStoreOtp,
    verifyOtp,
    updateDriverLocationInFirestore,
    clearHeroLocation,
    getHeroLocationFromFirestore,
} from '../services/heroService';
import { createLedgerEntry } from '../services/walletService';

// ── REGISTER ────────────────────────────────────────

export const registerAsHero = async (req: Request, res: Response): Promise<void> => {
    try {
        const { vehicleType = 'walk' } = req.body;
        const heroId = req.user!.uid;

        const driverDoc = await db.collection('deliveryDrivers').doc(heroId).get();
        if (driverDoc.exists) {
            res.status(400).json({ message: 'Already registered as a hero' });
            return;
        }

        const driverData = {
            user: heroId,
            vehicleType,
            isOnline: false,
            isAvailable: false,
            zone: 'default',
            totalDeliveries: 0,
            totalEarnings: 0,
            rating: 5.0,
            ratingCount: 0,
            currentDelivery: null,
            activeOrderId: null,
            currentLocation: { lat: 0, lng: 0 },
            lastLocationUpdate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.collection('deliveryDrivers').doc(heroId).set(driverData);
        await db.collection('users').doc(heroId).update({ isHeroMode: true });

        res.status(201).json({ message: 'Welcome to Student Hero! 🎒', driver: { id: heroId, ...driverData } });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

// ── TOGGLE ONLINE ───────────────────────────────────

export const toggleOnline = async (req: Request, res: Response): Promise<void> => {
    try {
        const heroId = req.user!.uid;
        const driverDoc = await db.collection('deliveryDrivers').doc(heroId).get();

        if (!driverDoc.exists) {
            res.status(404).json({ message: 'Not registered as a hero. Register first.' });
            return;
        }

        const driver = driverDoc.data()!;
        const newOnline = !driver.isOnline;
        const newAvailable = newOnline && !driver.currentDelivery;

        await db.collection('deliveryDrivers').doc(heroId).update({
            isOnline: newOnline,
            isAvailable: newAvailable,
            updatedAt: new Date(),
        });

        if (!newOnline) {
            await clearHeroLocation(heroId);
        }

        res.json({
            isOnline: newOnline,
            isAvailable: newAvailable,
            zone: driver.zone || 'default',
            message: newOnline ? 'You are now online! 🟢' : 'You are now offline 🔴',
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── STATUS ──────────────────────────────────────────

export const getHeroStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const heroId = req.user!.uid;
        const driverDoc = await db.collection('deliveryDrivers').doc(heroId).get();

        if (!driverDoc.exists) {
            res.json({ isHero: false });
            return;
        }

        const driver = driverDoc.data()!;

        // Get current delivery if any
        let currentDeliveryData = null;
        if (driver.currentDelivery) {
            const delDoc = await db.collection('deliveries').doc(driver.currentDelivery).get();
            if (delDoc.exists) currentDeliveryData = { _id: delDoc.id, ...delDoc.data() };
        }

        res.json({
            isHero: true,
            isOnline: driver.isOnline,
            isAvailable: driver.isAvailable,
            vehicleType: driver.vehicleType,
            zone: driver.zone,
            totalDeliveries: driver.totalDeliveries,
            totalEarnings: driver.totalEarnings,
            rating: driver.rating,
            currentDelivery: currentDeliveryData,
            activeOrderId: driver.activeOrderId,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── EARNINGS ────────────────────────────────────────

export const getEarnings = async (req: Request, res: Response): Promise<void> => {
    try {
        const heroId = req.user!.uid;
        const driverDoc = await db.collection('deliveryDrivers').doc(heroId).get();

        if (!driverDoc.exists) {
            res.status(404).json({ message: 'Not registered as hero' });
            return;
        }

        const driver = driverDoc.data()!;

        const deliveriesSnap = await db.collection('deliveries')
            .where('driver', '==', heroId)
            .where('status', '==', 'delivered')
            .orderBy('actualDeliveryTime', 'desc')
            .limit(20)
            .get();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let todayEarnings = 0;
        let todayCount = 0;
        const recentDeliveries: any[] = [];

        for (const doc of deliveriesSnap.docs) {
            const d = doc.data();
            const delTime = d.actualDeliveryTime?.toDate ? d.actualDeliveryTime.toDate() : new Date(d.actualDeliveryTime);

            if (delTime >= today) {
                todayEarnings += (d.deliveryFee || 0) + (d.tip || 0);
                todayCount++;
            }

            // Get order info
            let orderNumber = null;
            if (d.order) {
                const orderDoc = await db.collection('orders').doc(d.order).get();
                if (orderDoc.exists) orderNumber = orderDoc.data()!.orderNumber;
            }

            // Get store name
            let storeName = null;
            if (d.store) {
                const storeDoc = await db.collection('stores').doc(d.store).get();
                if (storeDoc.exists) storeName = storeDoc.data()!.name;
            }

            recentDeliveries.push({
                _id: doc.id,
                orderNumber,
                store: storeName,
                fee: d.deliveryFee || 0,
                tip: d.tip || 0,
                total: (d.deliveryFee || 0) + (d.tip || 0),
                deliveredAt: d.actualDeliveryTime,
            });
        }

        res.json({
            totalEarnings: driver.totalEarnings,
            totalDeliveries: driver.totalDeliveries,
            todayEarnings,
            todayDeliveries: todayCount,
            rating: driver.rating,
            recentDeliveries,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── AVAILABLE ORDERS ────────────────────────────────

export const getAvailableOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get all existing delivery order IDs (so we don't show already-assigned orders)
        const existingSnap = await db.collection('deliveries')
            .where('status', 'in', ['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'])
            .get();
        const existingOrderIds = new Set(existingSnap.docs.map(d => d.data().order));

        // Get all child delivery orders that are ready
        const ordersSnap = await db.collection('orders')
            .where('type', '==', 'child')
            .where('orderType', '==', 'delivery')
            .where('status', 'in', ['pending', 'confirmed', 'preparing', 'ready', 'ready_for_pickup'])
            .orderBy('createdAt', 'asc')
            .limit(20)
            .get();

        const orders = [];
        for (const doc of ordersSnap.docs) {
            if (existingOrderIds.has(doc.id)) continue;

            const data = doc.data();

            // Get user name
            let userName = null;
            if (data.user) {
                const userDoc = await db.collection('users').doc(data.user).get();
                if (userDoc.exists) userName = userDoc.data()!.name;
            }

            // Get store name
            let storeInfo = null;
            if (data.store) {
                const storeDoc = await db.collection('stores').doc(data.store).get();
                if (storeDoc.exists) storeInfo = { _id: storeDoc.id, name: storeDoc.data()!.name };
            }

            orders.push({
                _id: doc.id,
                ...data,
                user: data.user ? { _id: data.user, name: userName } : null,
                store: storeInfo,
            });
        }

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── ACCEPT DELIVERY (Firestore transaction lock) ────

export const acceptDelivery = async (req: Request, res: Response): Promise<void> => {
    const orderId = req.params.orderId as string;
    const heroId = req.user!.uid;

    try {
        const tip = req.body?.tip || 0;

        const driverDoc = await db.collection('deliveryDrivers').doc(heroId).get();
        if (!driverDoc.exists || !driverDoc.data()!.isOnline) {
            res.status(400).json({ message: 'You must be online to accept deliveries' });
            return;
        }

        const driver = driverDoc.data()!;
        if (driver.activeOrderId || driver.currentDelivery) {
            res.status(400).json({ message: 'Complete your current delivery first.' });
            return;
        }

        // Use a Firestore transaction to atomically check + assign
        const deliveryRef = db.collection('deliveries').doc();

        await db.runTransaction(async (t) => {
            // Check no existing delivery for this order
            const existingSnap = await db.collection('deliveries')
                .where('order', '==', orderId)
                .where('status', 'in', ['assigned', 'accepted', 'picked_up', 'in_transit'])
                .limit(1)
                .get();

            if (!existingSnap.empty) {
                throw new Error('Order already has a hero assigned');
            }

            const orderDoc = await t.get(db.collection('orders').doc(orderId));
            if (!orderDoc.exists) throw new Error('Order not found');

            const orderData = orderDoc.data()!;
            let pickupAddress = 'Campus Store';
            if (orderData.store) {
                const storeDoc = await t.get(db.collection('stores').doc(orderData.store));
                if (storeDoc.exists) pickupAddress = storeDoc.data()!.settings?.address || 'Campus Store';
            }

            const now = new Date();

            // Create delivery
            t.set(deliveryRef, {
                order: orderId,
                driver: heroId,
                customer: orderData.user,
                store: orderData.store || null,
                pickupAddress,
                deliveryAddress: orderData.deliveryAddress || '',
                deliveryFee: 3.00,
                tip,
                status: 'accepted',
                estimatedTime: 30,
                actualPickupTime: null,
                actualDeliveryTime: null,
                locationHistory: [],
                notes: '',
                createdAt: now,
                updatedAt: now,
            });

            // Update order
            t.update(db.collection('orders').doc(orderId), {
                status: 'hero_assigned',
                heroId,
                acceptedAt: now,
                updatedAt: now,
            });

            // Update driver
            t.update(db.collection('deliveryDrivers').doc(heroId), {
                currentDelivery: deliveryRef.id,
                activeOrderId: orderId,
                isAvailable: false,
                acceptTimestamp: now,
                updatedAt: now,
            });
        });

        // Write to deliveryTracking for real-time customer updates
        await db.collection('deliveryTracking').doc(deliveryRef.id).set({
            deliveryId: deliveryRef.id,
            orderId,
            driverId: heroId,
            driverName: req.user!.name,
            customerId: (await db.collection('orders').doc(orderId).get()).data()!.user,
            status: 'accepted',
            driverLocation: null,
            updatedAt: new Date(),
        });

        res.status(201).json({
            message: 'Delivery accepted! Head to the store. 🏃',
            delivery: { id: deliveryRef.id },
        });
    } catch (error: any) {
        if (error.message?.includes('already has a hero')) {
            res.status(409).json({ message: 'Order already taken by another hero! ⚡' });
        } else {
            res.status(500).json({ message: error.message || 'Server Error' });
        }
    }
};

// ── UPDATE DELIVERY STATUS ──────────────────────────

export const updateDeliveryStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.body;
        const validStatuses = ['picked_up', 'in_transit', 'delivered', 'cancelled'];

        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            return;
        }

        const deliveryDoc = await db.collection('deliveries').doc(req.params.id as string).get();
        if (!deliveryDoc.exists || deliveryDoc.data()!.driver !== req.user!.uid) {
            res.status(404).json({ message: 'Delivery not found' });
            return;
        }

        const delivery = deliveryDoc.data()!;
        const now = new Date();

        if (status === 'delivered') {
            const orderDoc = await db.collection('orders').doc(delivery.order).get();
            if (!orderDoc.data()?.otpVerified) {
                res.status(403).json({
                    message: 'OTP verification required before marking delivered.',
                    requiresOtp: true,
                });
                return;
            }
        }

        const updates: any = { status, updatedAt: now };

        if (status === 'picked_up') {
            updates.actualPickupTime = now;
            await db.collection('deliveries').doc(req.params.id as string).update(updates);
            await db.collection('orders').doc(delivery.order).update({ pickedUpAt: now, updatedAt: now });

            // Generate OTP
            const plain = await generateAndStoreOtp(delivery.order);

            // Update delivery tracking for real-time
            await db.collection('deliveryTracking').doc(req.params.id as string).update({
                status: 'picked_up',
                otp: plain,
                updatedAt: now,
            });

            res.json({ message: 'Status updated to picked_up. OTP sent to student. 📦' });
            return;
        }

        if (status === 'delivered') {
            updates.actualDeliveryTime = now;
            await db.collection('deliveries').doc(req.params.id as string).update(updates);

            await db.collection('orders').doc(delivery.order).update({
                status: 'delivered',
                deliveredAt: now,
                updatedAt: now,
            });

            // Free up driver
            const heroId = req.user!.uid;
            const driverDoc = await db.collection('deliveryDrivers').doc(heroId).get();
            if (driverDoc.exists) {
                const d = driverDoc.data()!;
                await db.collection('deliveryDrivers').doc(heroId).update({
                    totalDeliveries: (d.totalDeliveries || 0) + 1,
                    totalEarnings: (d.totalEarnings || 0) + (delivery.deliveryFee || 0) + (delivery.tip || 0),
                    currentDelivery: null,
                    activeOrderId: null,
                    isAvailable: d.isOnline,
                    updatedAt: now,
                });
            }

            await clearHeroLocation(heroId);

            // Credit earnings
            try {
                await createLedgerEntry({
                    userId: heroId,
                    type: 'credit',
                    amount: (delivery.deliveryFee || 0) + (delivery.tip || 0),
                    category: 'delivery_earning',
                    reference: `Delivery fee for order ${delivery.order}`,
                    orderId: delivery.order,
                });
            } catch (e) {
                console.warn('Ledger credit failed:', e);
            }

            // Update tracking
            await db.collection('deliveryTracking').doc(req.params.id as string).update({
                status: 'delivered',
                updatedAt: now,
            });

            res.json({ message: 'Delivery completed! Earnings credited. 🎉' });
            return;
        }

        if (status === 'cancelled') {
            await db.collection('deliveries').doc(req.params.id as string).update(updates);
            const heroId = req.user!.uid;
            await db.collection('deliveryDrivers').doc(heroId).update({
                currentDelivery: null,
                activeOrderId: null,
                isAvailable: true,
                updatedAt: now,
            });
            await clearHeroLocation(heroId);
        } else {
            await db.collection('deliveries').doc(req.params.id as string).update(updates);
        }

        res.json({ message: `Status updated to '${status}'` });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── VERIFY OTP ──────────────────────────────────────

export const verifyDeliveryOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { otp } = req.body;
        const deliveryDoc = await db.collection('deliveries').doc(req.params.id as string).get();

        if (!deliveryDoc.exists || deliveryDoc.data()!.driver !== req.user!.uid) {
            res.status(404).json({ message: 'Delivery not found' });
            return;
        }

        const result = await verifyOtp(deliveryDoc.data()!.order, otp);

        if (result.success) {
            res.json({ success: true, message: 'OTP verified! You can now complete the delivery. ✅' });
        } else {
            res.status(result.locked ? 423 : 400).json({
                success: false,
                locked: result.locked,
                remainingAttempts: result.remainingAttempts,
                message: result.error,
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── LOCATION UPDATE ─────────────────────────────────

export const updateLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { lng, lat } = req.body;
        const heroId = req.user!.uid;

        const driverDoc = await db.collection('deliveryDrivers').doc(heroId).get();
        if (!driverDoc.exists) {
            res.status(404).json({ message: 'Not registered as hero' });
            return;
        }

        const cached = await updateDriverLocationInFirestore(heroId, lat, lng);

        // Update driver's location in deliveryDrivers
        await db.collection('deliveryDrivers').doc(heroId).update({
            currentLocation: { lat, lng },
            lastLocationUpdate: new Date(),
            updatedAt: new Date(),
        });

        // Update delivery tracking for real-time customer view
        const driver = driverDoc.data()!;
        if (driver.currentDelivery) {
            await db.collection('deliveryTracking').doc(driver.currentDelivery).update({
                driverLocation: { lat, lng },
                updatedAt: new Date(),
            });
        }

        res.json({ message: 'Location updated', cached });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── TRACK DELIVERY (customer-facing) ────────────────

export const trackDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
        const deliverySnap = await db.collection('deliveries')
            .where('customer', '==', req.user!.uid)
            .where('__name__', '==', req.params.deliveryId as string)
            .limit(1)
            .get();

        // Fallback: just get by ID
        let deliveryDoc = deliverySnap.empty
            ? await db.collection('deliveries').doc(req.params.deliveryId as string).get()
            : deliverySnap.docs[0];

        if (!deliveryDoc || (deliveryDoc instanceof Object && 'exists' in deliveryDoc && !deliveryDoc.exists)) {
            res.status(404).json({ message: 'Delivery not found' });
            return;
        }

        const delivery = deliveryDoc.data ? deliveryDoc.data()! : (deliveryDoc as any).data();

        // Get driver name
        let driverName = null;
        if (delivery.driver) {
            const driverUser = await db.collection('users').doc(delivery.driver).get();
            if (driverUser.exists) driverName = driverUser.data()!.name;
        }

        // Get location
        const location = await getHeroLocationFromFirestore(delivery.driver || '');

        res.json({
            delivery: {
                _id: 'id' in deliveryDoc ? deliveryDoc.id : (deliveryDoc as any).id,
                status: delivery.status,
                estimatedTime: delivery.estimatedTime,
                pickupAddress: delivery.pickupAddress,
                deliveryAddress: delivery.deliveryAddress,
                driverName,
            },
            location,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── ADMIN OTP OVERRIDE ──────────────────────────────

export const adminOtpOverride = async (req: Request, res: Response): Promise<void> => {
    try {
        const { reason } = req.body;
        if (!reason || reason.trim().length < 10) {
            res.status(400).json({ message: 'A reason of at least 10 characters is required' });
            return;
        }

        await db.collection('orders').doc(req.params.orderId as string).update({
            otpVerified: true,
            otpLocked: false,
            updatedAt: new Date(),
        });

        console.warn(`Admin OTP override for order ${req.params.orderId as string} — reason: ${reason}`);
        res.json({ message: 'OTP bypassed. Order can now be marked delivered.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ── ACTIVE DELIVERY ─────────────────────────────────

export const getActiveDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
        const heroId = req.user!.uid;
        const snap = await db.collection('deliveries')
            .where('driver', '==', heroId)
            .where('status', 'in', ['assigned', 'accepted', 'picked_up', 'in_transit'])
            .limit(1)
            .get();

        if (snap.empty) {
            res.json(null);
            return;
        }

        const doc = snap.docs[0];
        const data = doc.data();

        // Populate order
        let orderInfo = null;
        if (data.order) {
            const orderDoc = await db.collection('orders').doc(data.order).get();
            if (orderDoc.exists) {
                const od = orderDoc.data()!;
                orderInfo = {
                    _id: orderDoc.id,
                    orderNumber: od.orderNumber,
                    total: od.total,
                    deliveryAddress: od.deliveryAddress,
                    items: od.items,
                    otpVerified: od.otpVerified,
                    pickedUpAt: od.pickedUpAt,
                    acceptedAt: od.acceptedAt,
                };
            }
        }

        // Populate customer
        let customerInfo = null;
        if (data.customer) {
            const custDoc = await db.collection('users').doc(data.customer).get();
            if (custDoc.exists) customerInfo = { _id: custDoc.id, name: custDoc.data()!.name, email: custDoc.data()!.email };
        }

        // Populate store
        let storeInfo = null;
        if (data.store) {
            const storeDoc = await db.collection('stores').doc(data.store).get();
            if (storeDoc.exists) storeInfo = { _id: storeDoc.id, name: storeDoc.data()!.name, settings: storeDoc.data()!.settings };
        }

        res.json({
            _id: doc.id,
            ...data,
            order: orderInfo,
            customer: customerInfo,
            store: storeInfo,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
