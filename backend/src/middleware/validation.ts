import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ── Shared strong password rule (OWASP-compliant) ────────────────────────────
const strongPassword = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (e.g. !@#$%)');

export const signupSchema = z.object({
    name: z.string().min(2).max(100).trim(),
    email: z.string().email().max(255).trim().toLowerCase(),
    password: strongPassword,
    role: z.enum(['student', 'shopkeeper', 'seller', 'hero']).default('student'),
    shopName: z.string().min(2).max(200).trim().optional(),
    description: z.string().max(1000).trim().optional(),
    category: z.enum(['food', 'books', 'stationery', 'electronics', 'clothing', 'services', 'other']).optional(),
    zone: z.enum(['north_gate', 'south_gate', 'hostel_area', 'academic_block', 'main_market', 'food_court', 'admin_block', 'other']).optional(),
});

export const loginSchema = z.object({
    email: z.string().email().max(255).trim().toLowerCase(),
    password: z.string().min(1).max(128),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1),
});

// ─── ORDER SCHEMAS ──────────────────────────────────────────

export const createOrderSchema = z.object({
    deliveryAddress: z.string().min(1).max(500).trim(),
    notes: z.string().max(1000).trim().optional(),
    orderType: z.enum(['delivery', 'takeaway']).default('delivery'),
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'ready_for_pickup',
        'hero_assigned', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled']),
});

// ─── PAYMENT SCHEMAS ────────────────────────────────────────

export const createPaymentIntentSchema = z.object({
    orderId: z.string().min(1).regex(/^[a-fA-F0-9]{24}$/, 'Invalid order ID'),
});

export const onboardConnectSchema = z.object({
    type: z.enum(['vendor', 'hero']),
});

// ─── RAZORPAY SCHEMAS ───────────────────────────────────────

export const razorpayCreateOrderSchema = z.object({
    orderId: z.string().min(1).regex(/^[a-fA-F0-9]{24}$/, 'Invalid order ID'),
});

export const razorpayVerifySchema = z.object({
    orderId: z.string().min(1).regex(/^[a-fA-F0-9]{24}$/, 'Invalid order ID'),
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
});

export const razorpayWalletTopupSchema = z.object({
    amount: z.number().min(1, 'Minimum top-up is ₹1').max(10000, 'Maximum top-up is ₹10,000'),
});

export const razorpayWalletVerifySchema = z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
    amount: z.number().min(1),
});

// ─── DISPUTE SCHEMAS ────────────────────────────────────────

export const createDisputeSchema = z.object({
    orderId: z.string().min(1).regex(/^[a-fA-F0-9]{24}$/, 'Invalid order ID'),
    reason: z.enum(['wrong_item', 'never_delivered', 'damaged', 'quality', 'overcharged', 'other']),
    description: z.string().min(10).max(2000).trim(),
});

export const resolveDisputeSchema = z.object({
    resolution: z.enum(['refund_full', 'refund_partial', 'wallet_credit', 'rejected', 'resolved_no_action']),
    adminNotes: z.string().max(2000).trim().optional(),
    refundAmount: z.number().min(0).optional(),
});

// ─── HERO SCHEMAS ───────────────────────────────────────────

export const registerHeroSchema = z.object({
    vehicleType: z.enum(['walk', 'bicycle', 'scooter', 'car']).default('walk'),
});

export const updateLocationSchema = z.object({
    lng: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
});

export const updateDeliveryStatusSchema = z.object({
    status: z.enum(['picked_up', 'in_transit', 'delivered', 'cancelled']),
});

export const acceptDeliverySchema = z.object({
    tip: z.number().min(0).max(10000).optional().default(0),
});

export const verifyOtpSchema = z.object({
    otp: z.string().length(4, 'OTP must be exactly 4 digits').regex(/^\d{4}$/, 'OTP must be 4 numeric digits'),
});

export const adminOtpOverrideSchema = z.object({
    reason: z.string().min(10, 'Override reason must be at least 10 characters'),
});

// ─── HERO RATING SCHEMA ────────────────────────────────────

export const rateHeroSchema = z.object({
    deliveryId: z.string().min(1).regex(/^[a-fA-F0-9]{24}$/, 'Invalid delivery ID'),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).trim().optional(),
});

// ─── PRODUCT SCHEMAS ────────────────────────────────────────

export const productSchema = z.object({
    name: z.string().min(2).max(200).trim(),
    description: z.string().max(2000).trim().optional(),
    price: z.number().min(0).max(100000),
    inventory: z.number().int().min(0).max(999999),
    category: z.enum(['food', 'books', 'stationery', 'electronics', 'clothing', 'services', 'other']),
    tags: z.array(z.string().max(50)).max(20).optional(),
    images: z.array(z.string()).max(4).optional(),
});

// ─── STORE SCHEMAS ──────────────────────────────────────────

export const storeUpdateSchema = z.object({
    name: z.string().min(2).max(200).trim().optional(),
    description: z.string().max(2000).trim().optional(),
    category: z.enum(['food', 'books', 'stationery', 'electronics', 'clothing', 'services', 'other']).optional(),
    zone: z.enum(['north_gate', 'south_gate', 'hostel_area', 'academic_block', 'main_market', 'food_court', 'admin_block', 'other']).optional(),
    openForUniGuide: z.boolean().optional(),
    settings: z.object({
        deliveryRadius: z.number().min(0).max(100).optional(),
        address: z.string().max(500).trim().optional(),
        openingHours: z.string().max(200).trim().optional(),
    }).optional(),
});

// ─── VALIDATION MIDDLEWARE ──────────────────────────────────

/**
 * Express middleware factory: validates req.body against a Zod schema.
 * Returns 400 with clear error messages on failure.
 */
export const validate = (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));
            res.status(400).json({
                message: 'Validation failed',
                errors,
            });
            return;
        }
        req.body = result.data; // replace with sanitised data
        next();
    };
};
