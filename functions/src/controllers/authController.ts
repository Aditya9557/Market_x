import { Request, Response } from 'express';
import { auth, db } from '../config/firebase';
import bcrypt from 'bcryptjs';

/**
 * @route   POST /api/auth/signup
 * @desc    Create a new user with Firebase Auth + Firestore profile
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, role, shopName, description, category, zone } = req.body;

    // Block admin registration via API
    if (role === 'admin') {
        res.status(403).json({ message: 'Admin registration is not allowed' });
        return;
    }

    // If 'seller', map to 'shopkeeper' role
    const isVendor = role === 'shopkeeper' || role === 'seller';
    const storeType = role === 'seller' ? 'virtual' : 'physical';
    const mappedRole = isVendor ? 'shopkeeper' : (role || 'student');
    const status = isVendor ? 'pending' : 'active';

    try {
        // Check if user already exists
        try {
            await auth.getUserByEmail(email);
            res.status(400).json({ message: 'User already exists' });
            return;
        } catch (e: any) {
            // auth/user-not-found is expected (user doesn't exist yet)
            if (e.code !== 'auth/user-not-found') throw e;
        }

        // Create Firebase Auth user
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        // Set custom claims for role
        await auth.setCustomUserClaims(userRecord.uid, { role: mappedRole });

        // Hash password for Firestore backup (Firebase Auth handles auth, this is for reference)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create Firestore user document
        const userData: any = {
            name,
            email,
            password: hashedPassword,
            role: mappedRole,
            status,
            shopName: isVendor ? shopName : null,
            walletBalance: 0,
            isHeroMode: false,
            locationServicesEnabled: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.collection('users').doc(userRecord.uid).set(userData);

        // If shopkeeper/seller, auto-create a Store entity
        let storeData = null;
        if (isVendor) {
            const storeRef = db.collection('stores').doc();
            const storeDoc = {
                name: shopName || `${name}'s Store`,
                owner: userRecord.uid,
                status: 'pending',
                description: description || '',
                category: category || 'other',
                zone: zone || 'other',
                storeType,
                commissionRate: 10,
                images: [],
                settings: {
                    openingHours: '9:00 AM - 9:00 PM',
                    deliveryRadius: 5,
                    address: '',
                },
                approvedForUniGuide: false,
                openForUniGuide: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await storeRef.set(storeDoc);

            // Link store to user
            await db.collection('users').doc(userRecord.uid).update({
                store: storeRef.id,
            });

            storeData = {
                _id: storeRef.id,
                name: storeDoc.name,
                status: storeDoc.status,
            };
        }

        // Generate a custom token for the client to sign in
        const customToken = await auth.createCustomToken(userRecord.uid, { role: mappedRole });

        res.status(201).json({
            _id: userRecord.uid,
            name,
            email,
            role: mappedRole,
            status,
            store: storeData,
            token: customToken,
        });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user — verify credentials server-side, return custom token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
        // Find user by email in Firebase Auth
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
        } catch {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        // Get user's Firestore doc for password check and extra data
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        if (!userDoc.exists) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        const userData = userDoc.data()!;

        // Verify password against stored hash
        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        if (userData.status === 'rejected') {
            res.status(403).json({ message: 'Your account has been rejected.' });
            return;
        }

        // Get store info for shopkeepers
        let storeData = null;
        if (userData.role === 'shopkeeper' && userData.store) {
            const storeDoc = await db.collection('stores').doc(userData.store).get();
            if (storeDoc.exists) {
                const sd = storeDoc.data()!;
                storeData = {
                    _id: storeDoc.id,
                    name: sd.name,
                    status: sd.status,
                };
            }
        }

        // Generate custom token
        const customToken = await auth.createCustomToken(userRecord.uid, { role: userData.role });

        res.json({
            _id: userRecord.uid,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            status: userData.status,
            store: storeData,
            token: customToken,
        });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout — revoke refresh tokens in Firebase Auth
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        if (req.user?.uid) {
            await auth.revokeRefreshTokens(req.user.uid);
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
