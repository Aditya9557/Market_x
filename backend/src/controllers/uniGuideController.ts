import { Request, Response } from 'express';
import Store from '../models/Store';
import CampusPOI from '../models/CampusPOI';
import Order from '../models/Order';
import Delivery from '../models/Delivery';

const ZONE_LABELS: Record<string, string> = {
    north_gate: '🚪 North Gate',
    south_gate: '🚪 South Gate',
    hostel_area: '🏠 Hostel Area',
    academic_block: '📚 Academic Block',
    main_market: '🏪 Main Market',
    food_court: '🍽️ Food Court',
    admin_block: '🏛️ Admin Block',
    other: '📍 Other'
};

/**
 * @route   GET /api/uniguide/shops
 * @desc    List campus shops visible in Uni Guide (public)
 */
export const getUniGuideShops = async (req: Request, res: Response): Promise<void> => {
    try {
        const { zone, category, search, openOnly, storeType } = req.query;
        const filter: any = {
            status: 'approved',
            approvedForUniGuide: true
        };

        // Zone filter (comma-separated)
        if (zone && typeof zone === 'string' && zone !== 'all') {
            const zones = zone.split(',').map(z => z.trim());
            filter.zone = zones.length === 1 ? zones[0] : { $in: zones };
        }

        // Category filter
        if (category && typeof category === 'string' && category !== 'all') {
            filter.category = category;
        }

        // Open only toggle
        if (openOnly === 'true') {
            filter.openForUniGuide = true;
        }

        // Store Type filter
        if (storeType && typeof storeType === 'string' && storeType !== 'all') {
            filter.storeType = storeType;
        }

        // Search
        if (search && typeof search === 'string') {
            filter.name = { $regex: search, $options: 'i' };
        }

        const shops = await Store.find(filter)
            .select('-stripeAccountId -commissionRate')
            .populate('owner', 'name')
            .sort({ zone: 1, name: 1 });

        res.json(shops);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/uniguide/zones
 * @desc    Get zone names with shop counts (public)
 */
export const getUniGuideZones = async (_req: Request, res: Response): Promise<void> => {
    try {
        const zones = await Store.aggregate([
            { $match: { status: 'approved', approvedForUniGuide: true } },
            { $group: { _id: '$zone', count: { $sum: 1 }, openCount: { $sum: { $cond: ['$openForUniGuide', 1, 0] } } } },
            { $sort: { _id: 1 } }
        ]);

        const result = zones.map(z => ({
            zone: z._id,
            label: ZONE_LABELS[z._id] || z._id,
            totalShops: z.count,
            openShops: z.openCount
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/uniguide/hero-tasks
 * @desc    Get pending delivery tickets for hero (authenticated heroes)
 */
export const getHeroTasks = async (req: Request, res: Response): Promise<void> => {
    try {
        // Find orders that don't have a delivery assigned yet
        const existingDeliveryOrderIds = await Delivery.distinct('order', {
            status: { $nin: ['cancelled'] }
        });

        const orders = await Order.find({
            type: 'parent',
            orderType: 'delivery',
            status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'ready_for_pickup'] },
            _id: { $nin: existingDeliveryOrderIds }
        })
            .populate('user', 'name currentLocation')
            .sort({ createdAt: -1 })
            .limit(20);

        // Enrich with store info from child orders
        const tasks = await Promise.all(orders.map(async (order) => {
            const childOrder = await Order.findOne({ parentOrder: order._id, type: 'child' })
                .populate('store', 'name zone settings category');
            return {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                total: order.total,
                deliveryAddress: order.deliveryAddress,
                createdAt: (order as any).createdAt,
                customer: order.user,
                store: childOrder?.store || null,
                itemCount: order.items?.length || 0
            };
        }));

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   POST /api/uniguide/request-hero
 * @desc    Create a hero request from an existing order (student)
 */
export const requestHero = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.body;
        const userId = (req as any).user._id;

        const order = await Order.findOne({ _id: orderId, user: userId, type: 'parent' });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        if (order.orderType !== 'delivery') {
            res.status(400).json({ message: 'Only delivery orders can request a hero' });
            return;
        }

        // Check if already has a delivery assigned
        const existing = await Delivery.findOne({ order: orderId, status: { $nin: ['cancelled'] } });
        if (existing) {
            res.status(400).json({ message: 'A hero is already assigned to this order' });
            return;
        }

        // Mark the order as ready for pickup so heroes can see it
        if (order.status === 'pending') {
            order.status = 'confirmed';
            await order.save();
        }

        res.json({ message: 'Hero request sent! A delivery hero will pick up your order soon. 🦸' });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   GET /api/uniguide/pois
 * @desc    Get campus POIs filtered by zone (public)
 */
export const getUniGuidePOIs = async (req: Request, res: Response): Promise<void> => {
    try {
        const { zone, type } = req.query;
        const filter: any = { approved: true };

        if (zone && typeof zone === 'string' && zone !== 'all') {
            filter.zone = zone;
        }
        if (type && typeof type === 'string' && type !== 'all') {
            filter.type = type;
        }

        const pois = await CampusPOI.find(filter)
            .populate('linkedStore', 'name status category zone openForUniGuide')
            .sort({ legendNumber: 1 });

        res.json(pois);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
