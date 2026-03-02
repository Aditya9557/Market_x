import Order from '../models/Order';
import User from '../models/User';
import Delivery from '../models/Delivery';
import DeliveryDriver from '../models/DeliveryDriver';
import { sendPushNotification, sendEmail } from './notificationService';
import { createLedgerEntry } from './walletService';
import logger from '../config/logger';

/**
 * RetentionService — automated engagement triggers.
 * - Inactive 7 days → send offer
 * - Hero idle 3 days → incentive push
 * - Repeat order milestones → wallet rewards
 */

export const processRetentionTriggers = async (): Promise<{ processed: number; actions: string[] }> => {
    const actions: string[] = [];
    const now = new Date();

    // 1. Inactive students (no order in 7 days, but had ordered before)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activeUserIds = await Order.distinct('user', { type: 'parent', createdAt: { $gte: sevenDaysAgo } });
    const inactiveStudents = await User.find({
        role: 'student', status: 'active',
        _id: { $nin: activeUserIds },
    }).select('_id name email').limit(100).lean();

    for (const student of inactiveStudents) {
        // Check they had at least 1 prior order
        const priorOrders = await Order.countDocuments({ user: student._id, type: 'parent', status: 'delivered' });
        if (priorOrders === 0) continue;

        await sendEmail({
            to: student.email,
            subject: 'We miss you! 🎁 Here\'s ₹20 on us',
            html: `<h2>Hey ${student.name}!</h2>
                   <p>It's been a while since your last order. We've added <strong>₹20</strong> to your wallet as a welcome-back gift!</p>
                   <p>Order now and enjoy campus delivery. 🚀</p>`,
        });

        // Credit ₹20 re-engagement bonus
        await createLedgerEntry({
            userId: student._id.toString(),
            type: 'credit', amount: 20,
            category: 'wallet_credit',
            reference: 'Re-engagement bonus — 7-day inactive reward',
        });

        actions.push(`Student ${student.name}: ₹20 re-engagement bonus`);
    }

    // 2. Idle heroes (no delivery in 3 days)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const activeHeroIds = await Delivery.distinct('hero', { createdAt: { $gte: threeDaysAgo } });
    const idleHeroes = await User.find({
        role: 'hero', status: 'active',
        _id: { $nin: activeHeroIds },
    }).select('_id name email').limit(50).lean();

    for (const hero of idleHeroes) {
        await sendEmail({
            to: hero.email,
            subject: 'Orders are waiting! 🏃 Earn bonus today',
            html: `<h2>Hey ${hero.name}!</h2>
                   <p>There are orders waiting for pickup. Go online now and earn a <strong>1.2x incentive boost</strong> today!</p>`,
        });
        actions.push(`Hero ${hero.name}: idle notification sent`);
    }

    // 3. Repeat order milestones (5th, 10th, 25th, 50th order)
    const milestones = [5, 10, 25, 50];
    const recentDelivered = await Order.find({
        type: 'parent', status: 'delivered',
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    }).select('user').lean();

    const userIds = [...new Set(recentDelivered.map(o => o.user.toString()))];
    for (const uid of userIds) {
        const orderCount = await Order.countDocuments({ user: uid, type: 'parent', status: 'delivered' });
        if (milestones.includes(orderCount)) {
            const reward = orderCount >= 50 ? 100 : orderCount >= 25 ? 50 : orderCount >= 10 ? 30 : 15;
            await createLedgerEntry({
                userId: uid, type: 'credit', amount: reward,
                category: 'wallet_credit',
                reference: `Milestone reward — ${orderCount} orders completed! 🎉`,
            });
            actions.push(`User ${uid}: ₹${reward} milestone reward (${orderCount} orders)`);
        }
    }

    logger.info(`Retention engine processed: ${actions.length} actions`);
    return { processed: actions.length, actions };
};

export const getRetentionStats = async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalStudents, activeStudents7d, activeStudents30d, churnedStudents] = await Promise.all([
        User.countDocuments({ role: 'student', status: 'active' }),
        Order.distinct('user', { type: 'parent', createdAt: { $gte: sevenDaysAgo } }).then(r => r.length),
        Order.distinct('user', { type: 'parent', createdAt: { $gte: thirtyDaysAgo } }).then(r => r.length),
        (async () => {
            const active30dIds = await Order.distinct('user', { type: 'parent', createdAt: { $gte: thirtyDaysAgo } });
            return User.countDocuments({ role: 'student', status: 'active', _id: { $nin: active30dIds } });
        })(),
    ]);

    return {
        totalStudents, activeStudents7d, activeStudents30d, churnedStudents,
        retention7d: totalStudents > 0 ? Math.round((activeStudents7d / totalStudents) * 10000) / 100 : 0,
        retention30d: totalStudents > 0 ? Math.round((activeStudents30d / totalStudents) * 10000) / 100 : 0,
        churnRate: totalStudents > 0 ? Math.round((churnedStudents / totalStudents) * 10000) / 100 : 0,
    };
};
