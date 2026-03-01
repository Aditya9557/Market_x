import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Store from '../models/Store';
import {
    generateAccessToken,
    generateRefreshToken,
    refreshAccessToken,
    revokeRefreshToken,
} from '../services/authService';
import logger from '../config/logger';

export const signup = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, role, shopName, description, category, zone } = req.body;

    // Block admin registration via API
    if (role === 'admin') {
        res.status(403).json({ message: 'Admin registration is not allowed' });
        return;
    }

    // If 'seller', map to 'shopkeeper' role but keep track of virtual store type
    const isVendor = role === 'shopkeeper' || role === 'seller';
    const storeType = role === 'seller' ? 'virtual' : 'physical';
    const mappedRole = isVendor ? 'shopkeeper' : role;

    // Default status: pending for shopkeeper/seller, active for others
    const status = isVendor ? 'pending' : 'active';

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const user = await User.create({
            name,
            email,
            password,
            role: mappedRole || 'student',
            status,
            shopName: isVendor ? shopName : undefined
        });

        // If shopkeeper/seller, auto-create a Store entity linked to this user
        let storeData = null;
        if (isVendor && user) {
            const store = await Store.create({
                name: shopName || `${name}'s Store`,
                owner: user._id,
                status: 'pending',
                description: description || '',
                category: category || 'other',
                zone: zone || 'other',
                storeType: storeType
            });

            // Link the store back to the user
            user.store = store._id as any;
            await user.save();

            storeData = {
                _id: store._id,
                name: store.name,
                status: store.status
            };
        }

        if (user) {
            const accessToken = generateAccessToken(user._id as unknown as string);
            const refreshToken = await generateRefreshToken(
                user._id as unknown as string,
                req.headers['user-agent'],
                req.ip,
            );

            res.status(201).json({
                _id: (user as IUser)._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                store: storeData,
                token: accessToken,
                refreshToken,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            if (user.status === 'rejected') {
                res.status(403).json({ message: 'Your account has been rejected.' });
                return;
            }

            // Get store info for shopkeepers
            let storeData = null;
            if (user.role === 'shopkeeper' && user.store) {
                const store = await Store.findById(user.store).select('_id name status');
                if (store) {
                    storeData = {
                        _id: store._id,
                        name: store.name,
                        status: store.status
                    };
                }
            }

            const accessToken = generateAccessToken(user._id as unknown as string);
            const refreshToken = await generateRefreshToken(
                user._id as unknown as string,
                req.headers['user-agent'],
                req.ip,
            );

            res.json({
                _id: (user as IUser)._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                store: storeData,
                token: accessToken,
                refreshToken,
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token (rotation)
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        const result = await refreshAccessToken(
            refreshToken,
            req.headers['user-agent'],
            req.ip,
        );

        res.json({
            token: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
        });
    } catch (error: any) {
        logger.warn(`Refresh token error: ${error.message}`);
        const status = error.message.includes('reused') ? 401 : 401;
        res.status(status).json({ message: error.message });
    }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Revoke refresh token
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await revokeRefreshToken(refreshToken);
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
