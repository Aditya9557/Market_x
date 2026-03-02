import Order from '../models/Order';
import User from '../models/User';
import logger from '../config/logger';

/**
 * RouteOptimizerService — smart order batching and hero auto-scaling.
 */

interface BatchCandidate {
    orders: any[];
    vendorId: string;
    vendorName: string;
    deliveryBlock: string;
    estimatedSavings: number;
    totalItems: number;
}

interface ScalingAlert {
    currentOrders: number;
    availableHeroes: number;
    loadRatio: number;
    recommendedAction: string;
    severity: 'info' | 'warning' | 'critical';
    idleHeroes: any[];
    incentiveMultiplierSuggestion: number;
}

const extractDeliveryBlock = (address: string): string => {
    if (!address) return 'unknown';
    const normalised = address.toLowerCase().trim();
    const blockMatch = normalised.match(/block\s*([a-z0-9]+)/i)
        || normalised.match(/hostel\s*([a-z0-9]+)/i)
        || normalised.match(/building\s*([a-z0-9]+)/i);
    if (blockMatch) return blockMatch[0].toLowerCase();
    return normalised.slice(0, 20);
};

export const findBatchableOrders = async (): Promise<BatchCandidate[]> => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const pendingOrders = await Order.find({
        type: 'child', orderType: 'delivery',
        status: { $in: ['pending', 'confirmed', 'preparing'] },
        heroId: null, createdAt: { $gte: fiveMinAgo },
    }).populate('store', 'name').lean();

    if (pendingOrders.length < 2) return [];
    const groups = new Map<string, any[]>();
    for (const order of pendingOrders) {
        const storeId = (order.store as any)?._id?.toString() || 'unknown';
        const block = extractDeliveryBlock(order.deliveryAddress || '');
        const key = `${storeId}::${block}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(order);
    }

    const batches: BatchCandidate[] = [];
    for (const [key, orders] of groups) {
        if (orders.length < 2) continue;
        const [vendorId, deliveryBlock] = key.split('::');
        batches.push({
            orders: orders.map((o: any) => ({ id: o._id, orderNumber: o.orderNumber, items: o.items.length, subtotal: o.subtotal })),
            vendorId, vendorName: (orders[0].store as any)?.name || 'Unknown',
            deliveryBlock, estimatedSavings: (orders.length - 1) * 15,
            totalItems: orders.reduce((s: number, o: any) => s + o.items.length, 0),
        });
    }
    return batches;
};

export const checkHeroCapacity = async (): Promise<ScalingAlert> => {
    const [currentOrders, availableHeroes, idleHeroes] = await Promise.all([
        Order.countDocuments({ type: 'child', orderType: 'delivery', status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }, heroId: null }),
        User.countDocuments({ role: 'hero', status: 'active', isHeroMode: true }),
        User.find({ role: 'hero', status: 'active', isHeroMode: false }).select('_id name email').limit(20).lean(),
    ]);
    const loadRatio = availableHeroes > 0 ? currentOrders / availableHeroes : currentOrders;
    let severity: 'info' | 'warning' | 'critical' = 'info';
    let recommendedAction = 'Normal operations';
    let incentiveMultiplierSuggestion = 1.0;
    if (loadRatio > 8) { severity = 'critical'; recommendedAction = 'CRITICAL: Activate idle heroes. Boost incentive to 1.5x'; incentiveMultiplierSuggestion = 1.5; }
    else if (loadRatio > 5) { severity = 'warning'; recommendedAction = 'High load. Notify idle heroes, boost to 1.2x'; incentiveMultiplierSuggestion = 1.2; }
    return { currentOrders, availableHeroes, loadRatio: Math.round(loadRatio * 100) / 100, recommendedAction, severity, idleHeroes, incentiveMultiplierSuggestion };
};

export const getOperationalOverview = async () => {
    const [batches, capacity] = await Promise.all([findBatchableOrders(), checkHeroCapacity()]);
    return {
        batching: { batchableGroups: batches.length, totalBatchableOrders: batches.reduce((s, b) => s + b.orders.length, 0), estimatedSavings: batches.reduce((s, b) => s + b.estimatedSavings, 0), batches },
        heroCapacity: capacity, timestamp: new Date(),
    };
};
