import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * In-memory rate limiting for Cloud Functions.
 * Note: Each Cloud Function instance has its own memory, so rate limits
 * are per-instance. For strict global rate limiting, use Firebase
 * Realtime Database or Firestore counters.
 */

const keyGenerator = (req: Request): string => {
    return (req as any).user?.uid || req.ip || '127.0.0.1';
};

const handler = (_req: Request, res: Response): void => {
    res.status(429).json({
        message: 'Too many requests. Please slow down and try again later.',
        retryAfter: 60,
    });
};

/** Login: 10 attempts per 15 minutes per IP */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    handler,
});

/** Signup: 5 per hour per IP */
export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: 'Too many signup attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    handler,
});

/** Hero accept: 30 per minute per user */
export const heroAcceptLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler,
});

/** Payments: 10 per minute per user */
export const paymentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler,
});

/** General API: 200 per minute per user/IP */
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
});

/** Webhook: 100 per minute */
export const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
