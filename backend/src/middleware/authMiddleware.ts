import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import Store, { IStore } from '../models/Store';

// Extend Express Request to include user and store
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
            store?: IStore;
        }
    }
}

/**
 * Verifies JWT token from Authorization header.
 * Attaches the full user document to req.user.
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            res.status(401).json({ message: 'Not authorized, user not found' });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token invalid' });
    }
};

/**
 * Checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER the protect middleware.
 * 
 * Usage: authorize('admin', 'shopkeeper')
 */
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                message: `Role '${req.user.role}' is not authorized to access this resource`
            });
            return;
        }

        next();
    };
};

/**
 * For vendor routes: looks up the vendor's store and attaches it to req.store.
 * Also ensures the vendor's store is approved for most operations.
 * Must be used AFTER protect and authorize('shopkeeper').
 * 
 * @param requireApproved - If true (default), rejects requests if store is not approved.
 *                          Set to false for routes where pending vendors need access (e.g., viewing own store status).
 */
export const storeScope = (requireApproved: boolean = false) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        try {
            const store = await Store.findOne({ owner: req.user._id });

            if (!store) {
                res.status(404).json({ message: 'No store found for this vendor. Please contact support.' });
                return;
            }

            if (requireApproved && store.status !== 'approved') {
                res.status(403).json({
                    message: `Your store is currently '${store.status}'. You cannot perform this action until your store is approved.`
                });
                return;
            }

            req.store = store;
            next();
        } catch (error) {
            res.status(500).json({ message: 'Error loading store data' });
        }
    };
};
