import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import ContactMessage from '../models/ContactMessage';
import Cart from '../models/Cart';

/**
 * @desc    Get user profile (including wallet balance)
 * @route   GET /api/user/profile
 * @access  Private
 */
export const getUserProfile = async (req: Request | any, res: Response) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Update user location
 * @route   PUT /api/user/location
 * @access  Private
 */
export const updateLocation = async (req: Request | any, res: Response) => {
    const { latitude, longitude, enabled } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        if (enabled !== undefined) {
            user.locationServicesEnabled = enabled;
        }

        // We will store coordinates if provided
        if (latitude !== undefined && longitude !== undefined) {
            user.currentLocation = {
                type: 'Point',
                coordinates: [longitude, latitude] // GeoJSON format: [lng, lat]
            };
        }

        await user.save();
        res.json({
            message: 'Location updated',
            location: user.currentLocation,
            enabled: user.locationServicesEnabled
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

/**
 * @desc    Get wallet balance and transactions
 * @route   GET /api/user/wallet
 * @access  Private
 */
export const getWallet = async (req: Request | any, res: Response) => {
    try {
        const user = await User.findById(req.user.id);
        const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            balance: user.walletBalance,
            transactions
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Submit a contact message
 * @route   POST /api/user/contact
 * @access  Private
 */
export const contactSupport = async (req: Request | any, res: Response) => {
    const { subject, message } = req.body;

    try {
        const contactMessage = new ContactMessage({
            user: req.user.id,
            subject,
            message
        });

        await contactMessage.save();
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/user/delete
 * @access  Private
 */
export const deleteAccount = async (req: Request | any, res: Response) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Optional: Check if user has active orders before deleting
        // For now, we'll just proceed with deletion

        await Cart.findOneAndDelete({ user: req.user.id });
        // We might want to keep orders for record, so not deleting them.

        await User.findByIdAndDelete(req.user.id);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

/**
 * @desc    Get Terms & Conditions
 * @route   GET /api/user/terms
 * @access  Public
 */
export const getTerms = (req: Request, res: Response) => {
    res.json({
        title: "Terms & Conditions",
        content: `
        1. Introduction
        Welcome to CampusMarket. By using our app, you agree to these terms.
        
        2. User Accounts
        You are responsible for maintaining the security of your account.
        
        3. Orders & Deliveries
        All orders are subject to availability. Delivery times are estimates.
        
        4. Prohibited Items
        The sale of illegal or restricted items is strictly prohibited.
        
        5. Contact
        For any questions, please contact support.
        `
    });
};

/**
 * @desc    Get Privacy Policy & Refund Policy
 * @route   GET /api/user/privacy
 * @access  Public
 */
export const getPrivacy = (req: Request, res: Response) => {
    res.json({
        title: "Privacy & Refund Policy",
        content: `
        Privacy Policy:
        We collect only necessary data to provide our services. We do not share your data with third parties without consent.
        
        Refund Policy:
        Refunds are processed on a case-by-case basis. If you receive a wrong or damaged item, please contact support within 24 hours.
        `
    });
};
