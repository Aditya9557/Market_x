import { Request, Response } from 'express';
import { db, auth } from '../config/firebase';
import { getLedgerHistory } from '../services/walletService';

/**
 * @route   GET /api/user/profile
 */
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userDoc = await db.collection('users').doc(req.user!.uid).get();
        if (!userDoc.exists) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const { password, ...safeData } = userDoc.data()!;
        res.json({ _id: userDoc.id, ...safeData });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route   PUT /api/user/location
 */
export const updateLocation = async (req: Request, res: Response): Promise<void> => {
    const { latitude, longitude, enabled } = req.body;
    try {
        const updates: any = { updatedAt: new Date() };
        if (enabled !== undefined) updates.locationServicesEnabled = enabled;
        if (latitude !== undefined && longitude !== undefined) {
            updates.currentLocation = { lat: latitude, lng: longitude };
        }

        await db.collection('users').doc(req.user!.uid).update(updates);
        res.json({ message: 'Location updated', location: updates.currentLocation, enabled });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route   GET /api/user/wallet
 */
export const getWallet = async (req: Request, res: Response): Promise<void> => {
    try {
        const userDoc = await db.collection('users').doc(req.user!.uid).get();
        if (!userDoc.exists) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const transSnap = await db.collection('transactions')
            .where('user', '==', req.user!.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const transactions = transSnap.docs.map(d => ({ _id: d.id, ...d.data() }));

        res.json({
            balance: userDoc.data()!.walletBalance || 0,
            transactions,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route   POST /api/user/contact
 */
export const contactSupport = async (req: Request, res: Response): Promise<void> => {
    const { subject, message } = req.body;
    try {
        const ref = db.collection('contactMessages').doc();
        await ref.set({
            user: req.user!.uid,
            subject,
            message,
            createdAt: new Date(),
        });
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route   DELETE /api/user/delete
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const uid = req.user!.uid;

        // Delete cart
        await db.collection('carts').doc(uid).delete();

        // Delete Firestore user doc
        await db.collection('users').doc(uid).delete();

        // Delete Firebase Auth user
        await auth.deleteUser(uid);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @route   GET /api/user/terms (public)
 */
export const getTerms = (_req: Request, res: Response): void => {
    res.json({
        title: 'Terms & Conditions',
        content: `
        1. Introduction - Welcome to CampusMarket. By using our app, you agree to these terms.
        2. User Accounts - You are responsible for maintaining the security of your account.
        3. Orders & Deliveries - All orders are subject to availability. Delivery times are estimates.
        4. Prohibited Items - The sale of illegal or restricted items is strictly prohibited.
        5. Contact - For any questions, please contact support.
        `,
    });
};

/**
 * @route   GET /api/user/privacy (public)
 */
export const getPrivacy = (_req: Request, res: Response): void => {
    res.json({
        title: 'Privacy & Refund Policy',
        content: `
        Privacy Policy: We collect only necessary data to provide our services.
        Refund Policy: Refunds are processed on a case-by-case basis.
        `,
    });
};

/**
 * @route   GET /api/user/ledger
 */
export const getUserLedger = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await getLedgerHistory(req.user!.uid, page, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
