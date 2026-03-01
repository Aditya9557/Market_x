import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase';

// Extend Express Request to include Firebase user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                uid: string;
                email: string;
                name: string;
                role: string;
                status: string;
                walletBalance: number;
                store?: string; // store doc ID
                storeData?: {
                    id: string;
                    name: string;
                    status: string;
                };
            };
            store?: FirebaseFirestore.DocumentData & { id: string };
        }
    }
}

/**
 * Verifies Firebase ID token from Authorization header.
 * Attaches user data from Firestore to req.user.
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided' });
        return;
    }

    try {
        // Verify Firebase ID token
        const decoded = await auth.verifyIdToken(token);

        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(decoded.uid).get();

        if (!userDoc.exists) {
            res.status(401).json({ message: 'Not authorized, user not found' });
            return;
        }

        const userData = userDoc.data()!;
        req.user = {
            uid: decoded.uid,
            email: userData.email || decoded.email || '',
            name: userData.name || '',
            role: userData.role || 'student',
            status: userData.status || 'active',
            walletBalance: userData.walletBalance || 0,
            store: userData.store || undefined,
        };

        // Load store data for shopkeepers
        if (req.user.role === 'shopkeeper' && req.user.store) {
            const storeDoc = await db.collection('stores').doc(req.user.store).get();
            if (storeDoc.exists) {
                const sd = storeDoc.data()!;
                req.user.storeData = {
                    id: storeDoc.id,
                    name: sd.name,
                    status: sd.status,
                };
            }
        }

        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token invalid' });
    }
};

/**
 * Checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER the protect middleware.
 */
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                message: `Role '${req.user.role}' is not authorized to access this resource`,
            });
            return;
        }

        next();
    };
};

/**
 * For vendor routes: looks up the vendor's store and attaches it to req.store.
 */
export const storeScope = (requireApproved: boolean = false) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        try {
            // Query Firestore for store owned by this user
            const storesSnap = await db.collection('stores')
                .where('owner', '==', req.user.uid)
                .limit(1)
                .get();

            if (storesSnap.empty) {
                res.status(404).json({ message: 'No store found for this vendor. Please contact support.' });
                return;
            }

            const storeDoc = storesSnap.docs[0];
            const storeData = storeDoc.data();

            if (requireApproved && storeData.status !== 'approved') {
                res.status(403).json({
                    message: `Your store is currently '${storeData.status}'. You cannot perform this action until your store is approved.`,
                });
                return;
            }

            req.store = { ...storeData, id: storeDoc.id };
            next();
        } catch (error) {
            res.status(500).json({ message: 'Error loading store data' });
        }
    };
};
