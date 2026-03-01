import { Request, Response } from 'express';
import DeliveryDriver from '../models/DeliveryDriver';
import Delivery from '../models/Delivery';
import Order from '../models/Order';
import User from '../models/User';
import Store from '../models/Store';
import { acquireLock, releaseLock, getRedis } from '../config/redis';
import logger from '../config/logger';
import { getIO } from '../socket/socketServer';
import {
    generateAndStoreOtp,
    verifyOtp,
    cacheHeroLocation,
    clearHeroLocation,
    getHeroLocationFromCache,
    haversineEta,
    broadcastNewOrderToZone,
} from '../services/heroService';
import { createLedgerEntry } from '../services/walletService';

// ─────────────────────────────────────────────────────────────
// REGISTER & PROFILE
// ─────────────────────────────────────────────────────────────

export const registerAsHero = async (req: Request, res: Response): Promise<void> => {
    try {
        const { vehicleType = 'walk' } = req.body;
        let driver = await DeliveryDriver.findOne({ user: req.user!._id });
        if (driver) {
            res.status(400).json({ message: 'Already registered as a hero' });
            return;
        }
        driver = await DeliveryDriver.create({
            user: req.user!._id,
            vehicleType,
            isOnline: false,
            isAvailable: false,
            zone: 'default',
        });
        await User.findByIdAndUpdate(req.user!._id, { isHeroMode: true });
        res.status(201).json({ message: 'Welcome to Student Hero! 🎒', driver });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

// ─────────────────────────────────────────────────────────────
// TOGGLE ONLINE — joins/leaves zone room + clears location
// ─────────────────────────────────────────────────────────────

export const toggleOnline = async (req: Request, res: Response): Promise<void> => {
    try {
        const driver = await DeliveryDriver.findOne({ user: req.user!._id });
        if (!driver) {
            res.status(404).json({ message: 'Not registered as a hero. Register first.' });
            return;
        }

        driver.isOnline = !driver.isOnline;
        driver.isAvailable = driver.isOnline && !driver.currentDelivery;
        await driver.save();

        const io = getIO();
        const zone = driver.zone || 'default';

        // Notify all sockets for this user to join/leave zone room
        // (socket.ts handles the actual room join — we emit a signal)
        if (driver.isOnline) {
            io.emit(`hero:zone:join:${req.user!._id}`, { zone });
        } else {
            io.emit(`hero:zone:leave:${req.user!._id}`, { zone });
            await clearHeroLocation((req.user!._id as any).toString());
        }

        res.json({
            isOnline: driver.isOnline,
            isAvailable: driver.isAvailable,
            zone,
            message: driver.isOnline ? 'You are now online! 🟢' : 'You are now offline 🔴',
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ─────────────────────────────────────────────────────────────
// STATUS
// ─────────────────────────────────────────────────────────────

export const getHeroStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const driver = await DeliveryDriver.findOne({ user: req.user!._id }).populate('currentDelivery');
        if (!driver) {
            res.json({ isHero: false });
            return;
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
            currentDelivery: driver.currentDelivery,
            activeOrderId: driver.activeOrderId,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ─────────────────────────────────────────────────────────────
// EARNINGS
// ─────────────────────────────────────────────────────────────

export const getEarnings = async (req: Request, res: Response): Promise<void> => {
    try {
        const driver = await DeliveryDriver.findOne({ user: req.user!._id });
        if (!driver) {
            res.status(404).json({ message: 'Not registered as hero' });
            return;
        }
        const deliveries = await Delivery.find({ driver: req.user!._id, status: 'delivered' })
            .populate('order', 'orderNumber total')
            .populate('store', 'name')
            .sort({ actualDeliveryTime: -1 })
            .limit(20);

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayDeliveries = await Delivery.find({
            driver: req.user!._id, status: 'delivered',
            actualDeliveryTime: { $gte: today }
        });
        const todayEarnings = todayDeliveries.reduce((sum, d) => sum + d.deliveryFee + d.tip, 0);

        res.json({
            totalEarnings: driver.totalEarnings,
            totalDeliveries: driver.totalDeliveries,
            todayEarnings,
            todayDeliveries: todayDeliveries.length,
            rating: driver.rating,
            recentDeliveries: deliveries.map(d => ({
                _id: d._id,
                orderNumber: (d.order as any)?.orderNumber,
                store: (d.store as any)?.name,
                fee: d.deliveryFee,
                tip: d.tip,
                total: d.deliveryFee + d.tip,
                deliveredAt: d.actualDeliveryTime,
            })),
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ─────────────────────────────────────────────────────────────
// AVAILABLE ORDERS
// ─────────────────────────────────────────────────────────────

export const getAvailableOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const driver = await DeliveryDriver.findOne({ user: req.user!._id });
        const heroCoords = driver?.currentLocation?.coordinates || [0, 0];
        const radiusMeters = Number(req.query.radius) || 1000;

        let nearbyStoreIds: any[] = [];
        try {
            const nearbyStores = await Store.find({
                location: { $near: { $geometry: { type: 'Point', coordinates: heroCoords }, $maxDistance: radiusMeters } }
            }).select('_id');
            nearbyStoreIds = nearbyStores.map(s => s._id);
        } catch {
            const allStores = await Store.find({ status: 'approved' }).select('_id');
            nearbyStoreIds = allStores.map(s => s._id);
        }

        const existingDeliveryOrderIds = await Delivery.distinct('order', { status: { $nin: ['cancelled'] } });

        const orders = await Order.find({
            type: 'child',
            orderType: 'delivery',
            status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'ready_for_pickup'] },
            _id: { $nin: existingDeliveryOrderIds },
        })
            .populate('user', 'name')
            .populate('store', 'name')
            .sort({ createdAt: 1 }) // FIFO: oldest first
            .limit(20);

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ─────────────────────────────────────────────────────────────
// ACCEPT DELIVERY — Phase-1 FIFO Redis lock
// ─────────────────────────────────────────────────────────────

export const acceptDelivery = async (req: Request, res: Response): Promise<void> => {
    const { orderId } = req.params;
    const heroId = (req.user!._id as any).toString();
    const lockKey = `hero:accept:${orderId}`;
    const acceptStart = Date.now();

    // Atomic SETNX — only one hero wins
    const lockAcquired = await acquireLock(lockKey, 20000); // 20s TTL (longer than transaction)
    if (!lockAcquired) {
        res.status(409).json({ message: 'Order already taken by another hero! ⚡' });
        return;
    }

    try {
        const tip = req.body?.tip || 0;

        const driver = await DeliveryDriver.findOne({ user: heroId });
        if (!driver || !driver.isOnline) {
            res.status(400).json({ message: 'You must be online to accept deliveries' });
            return;
        }

        // Phase-1: hero cannot accept if already has an active order
        if (driver.activeOrderId || driver.currentDelivery) {
            res.status(400).json({ message: 'Complete your current delivery first.' });
            return;
        }

        const order = await Order.findById(orderId).populate('user', 'name email');
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        const existing = await Delivery.findOne({ order: orderId, status: { $nin: ['cancelled'] } });
        if (existing) {
            res.status(400).json({ message: 'Order already has a hero assigned' });
            return;
        }

        const store = await Store.findById(order.store);

        // Create delivery record
        const delivery = await Delivery.create({
            order: orderId,
            driver: heroId,
            customer: (order.user as any)._id || order.user,
            store: order.store || (order.user as any)._id,
            pickupAddress: store?.settings?.address || 'Campus Store',
            deliveryAddress: order.deliveryAddress,
            deliveryFee: 3.00,
            tip,
            status: 'accepted',
        });

        // Update order
        const now = new Date();
        await Order.findByIdAndUpdate(orderId, {
            status: 'hero_assigned',
            heroId: heroId,
            acceptedAt: now,
        });

        // Update driver: set activeOrderId, block from taking another
        driver.currentDelivery = delivery._id as any;
        driver.activeOrderId = order._id as any;
        driver.isAvailable = false;
        driver.acceptTimestamp = now;
        await driver.save();

        // Record response time for analytics
        const responseTimeMs = Date.now() - acceptStart;
        logger.info(`Hero ${heroId} accepted order ${orderId} in ${responseTimeMs}ms`);

        // Broadcast to zone — order is taken
        const io = getIO();
        const zone = driver.zone || 'default';
        io.to(`zone:${zone}`).emit('order:taken', { orderId, heroName: req.user!.name });

        // Notify customer
        io.to(`user:${(order.user as any)._id}`).emit('order:assigned', {
            orderId,
            heroName: req.user!.name,
            message: 'A Hero has accepted your order! 🦸',
        });

        res.status(201).json({
            message: 'Delivery accepted! Head to the store. 🏃',
            delivery,
            responseTimeMs,
        });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    } finally {
        await releaseLock(lockKey);
    }
};

// ─────────────────────────────────────────────────────────────
// UPDATE DELIVERY STATUS — Phase-1 OTP gate on delivered
// ─────────────────────────────────────────────────────────────

export const updateDeliveryStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status } = req.body;
        const validStatuses = ['picked_up', 'in_transit', 'delivered', 'cancelled'];

        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            return;
        }

        const delivery = await Delivery.findOne({ _id: req.params.id, driver: req.user!._id });
        if (!delivery) {
            res.status(404).json({ message: 'Delivery not found' });
            return;
        }

        // Phase-1: Block delivered if OTP not verified
        if (status === 'delivered') {
            const order = await Order.findById(delivery.order).select('otpVerified otpLocked');
            if (!order?.otpVerified) {
                res.status(403).json({
                    message: 'OTP verification required before marking delivered. Ask the student for their OTP.',
                    requiresOtp: true,
                });
                return;
            }
        }

        delivery.status = status;
        const now = new Date();

        if (status === 'picked_up') {
            delivery.actualPickupTime = now;
            await delivery.save();

            // Update pickedUpAt on order and generate OTP
            await Order.findByIdAndUpdate(delivery.order, { pickedUpAt: now });

            const plain = await generateAndStoreOtp(delivery.order.toString());

            // Emit OTP to student
            const io = getIO();
            io.to(`delivery:${delivery._id}`).emit('otp:generated', {
                otp: plain,
                expiresInSeconds: 600,
                message: 'Your delivery OTP — share ONLY with your Hero when they arrive.',
            });

            logger.info(`OTP sent to student for delivery ${delivery._id}`);
            res.json({ message: "Status updated to picked_up. OTP sent to student. 📦", delivery });
            return;
        }

        if (status === 'delivered') {
            delivery.actualDeliveryTime = now;
            await delivery.save();

            // Update order timestamps and status
            await Order.findByIdAndUpdate(delivery.order, {
                status: 'delivered',
                deliveredAt: now,
            });

            // Free up driver
            const driver = await DeliveryDriver.findOne({ user: req.user!._id });
            if (driver) {
                driver.totalDeliveries += 1;
                driver.totalEarnings += delivery.deliveryFee + delivery.tip;
                driver.currentDelivery = null;
                driver.activeOrderId = null;
                driver.isAvailable = driver.isOnline;
                await driver.save();
            }

            // Clear Redis location
            await clearHeroLocation((req.user!._id as any).toString());

            // Credit hero earnings via wallet ledger
            try {
                await createLedgerEntry({
                    userId: (req.user!._id as any).toString(),
                    type: 'credit',
                    amount: delivery.deliveryFee + delivery.tip,
                    category: 'delivery_earning',
                    reference: `Delivery fee for order ${delivery.order}`,
                    orderId: delivery.order.toString(),
                });
            } catch (ledgerErr) {
                logger.warn('Ledger credit failed for delivery:', ledgerErr);
            }

            // Broadcast completion to customer
            const io = getIO();
            io.to(`delivery:${delivery._id}`).emit('delivery:completed', {
                message: 'Your order has been delivered! 🎉',
                timestamp: now.toISOString(),
            });

            res.json({ message: "Delivery completed! Earnings credited. 🎉", delivery });
            return;
        }

        if (status === 'cancelled') {
            await delivery.save();
            const driver = await DeliveryDriver.findOne({ user: req.user!._id });
            if (driver) {
                driver.currentDelivery = null;
                driver.activeOrderId = null;
                driver.isAvailable = driver.isOnline;
                await driver.save();
            }
            await clearHeroLocation((req.user!._id as any).toString());
        }

        await delivery.save();
        res.json({ message: `Status updated to '${status}'`, delivery });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ─────────────────────────────────────────────────────────────
// VERIFY OTP — Phase-1 core
// ─────────────────────────────────────────────────────────────

export const verifyDeliveryOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { otp } = req.body;
        const deliveryId = req.params.id;

        const delivery = await Delivery.findOne({ _id: deliveryId, driver: req.user!._id });
        if (!delivery) {
            res.status(404).json({ message: 'Delivery not found' });
            return;
        }

        const result = await verifyOtp(delivery.order.toString(), otp);

        if (result.success) {
            res.json({
                success: true,
                message: 'OTP verified! You can now complete the delivery. ✅',
            });
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

// ─────────────────────────────────────────────────────────────
// LOCATION UPDATE — Redis cache only, no DB write
// ─────────────────────────────────────────────────────────────

export const updateLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { lng, lat } = req.body;
        if (lng === undefined || lat === undefined) {
            res.status(400).json({ message: 'lng and lat are required' });
            return;
        }

        const driver = await DeliveryDriver.findOne({ user: req.user!._id });
        if (!driver) {
            res.status(404).json({ message: 'Not registered as hero' });
            return;
        }

        // Redis-only cache (Phase-1: no MongoDB write per location update)
        const cached = await cacheHeroLocation((req.user!._id as any).toString(), lat, lng);

        if (cached && driver.currentDelivery) {
            // Broadcast to customer tracking this delivery
            const io = getIO();
            io.to(`delivery:${driver.currentDelivery}`).emit('order:hero:location', {
                coordinates: [lng, lat],
                timestamp: new Date().toISOString(),
            });

            // If we have a delivery destination, also emit ETA
            const delivery = await Delivery.findById(driver.currentDelivery).populate('order');
            if (delivery) {
                const order = delivery.order as any;
                // Hero current coords: lat/lng from request
                // We don't have customer coords server-side — ETA sent as placeholder
                // (Frontend computes precise ETA using haversineEta util)
                io.to(`delivery:${driver.currentDelivery}`).emit('order:hero:eta', {
                    distanceKm: null, // computed client-side
                    etaMinutes: delivery.estimatedTime || 15,
                });
            }
        }

        // Also update DB location for geospatial queries (but NOT history)
        driver.currentLocation = { type: 'Point', coordinates: [lng, lat] };
        driver.lastLocationUpdate = new Date();
        await driver.save();

        res.json({ message: 'Location updated', cached });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ─────────────────────────────────────────────────────────────
// TRACK DELIVERY (customer-facing)
// ─────────────────────────────────────────────────────────────

export const trackDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
        const delivery = await Delivery.findOne({
            _id: req.params.deliveryId,
            customer: req.user!._id,
        }).populate('driver', 'name');

        if (!delivery) {
            res.status(404).json({ message: 'Delivery not found' });
            return;
        }

        const driverUser = await DeliveryDriver.findOne({ user: delivery.driver });
        const heroId = (delivery.driver as any)?._id?.toString() || (delivery.driver as any)?.toString();

        // Prefer Redis location cache
        const cachedLocation = await getHeroLocationFromCache(heroId || '');

        res.json({
            delivery: {
                _id: delivery._id,
                status: delivery.status,
                estimatedTime: delivery.estimatedTime,
                pickupAddress: delivery.pickupAddress,
                deliveryAddress: delivery.deliveryAddress,
                driverName: (delivery.driver as any)?.name,
            },
            location: cachedLocation || (driverUser ? {
                lat: driverUser.currentLocation.coordinates[1],
                lng: driverUser.currentLocation.coordinates[0],
                lastUpdatedAt: driverUser.lastLocationUpdate?.toISOString(),
            } : null),
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ─────────────────────────────────────────────────────────────
// ADMIN OVERRIDE — bypass OTP with logged reason
// ─────────────────────────────────────────────────────────────

export const adminOtpOverride = async (req: Request, res: Response): Promise<void> => {
    try {
        const { reason } = req.body;
        if (!reason || reason.trim().length < 10) {
            res.status(400).json({ message: 'A reason of at least 10 characters is required for admin override' });
            return;
        }

        const order = await Order.findByIdAndUpdate(req.params.orderId, {
            otpVerified: true,
            otpLocked: false,
        }, { new: true });

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        logger.warn(`Admin OTP override for order ${req.params.orderId} — reason: ${reason}`);
        res.json({ message: 'OTP bypassed. Order can now be marked delivered.', order });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ─────────────────────────────────────────────────────────────
// ACTIVE DELIVERY
// ─────────────────────────────────────────────────────────────

export const getActiveDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
        const delivery = await Delivery.findOne({
            driver: req.user!._id,
            status: { $in: ['assigned', 'accepted', 'picked_up', 'in_transit'] },
        })
            .populate('order', 'orderNumber total deliveryAddress items otpVerified pickedUpAt acceptedAt')
            .populate('customer', 'name email')
            .populate('store', 'name settings');

        if (!delivery) {
            res.json(null);
            return;
        }

        res.json(delivery);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
