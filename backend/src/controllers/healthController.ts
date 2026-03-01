import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import { getRedis } from '../config/redis';
import logger from '../config/logger';

const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    : null;

type ServiceStatus = 'ok' | 'degraded' | 'down';

interface ServiceCheck {
    status: ServiceStatus;
    latencyMs?: number;
    message?: string;
}

/**
 * GET /api/health
 * Returns system health status for load balancers, uptime monitors, and admin dashboards.
 * Non-critical services (Redis, Stripe) degrade to 'degraded' rather than 'down'.
 */
export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
    const checks: Record<string, ServiceCheck> = {};

    // ── MongoDB ──────────────────────────────────────────────────────────────
    try {
        const start = Date.now();
        const state = mongoose.connection.readyState;
        if (state === 1) {
            await mongoose.connection.db!.admin().ping();
            checks.mongodb = { status: 'ok', latencyMs: Date.now() - start };
        } else {
            checks.mongodb = { status: 'down', message: `readyState=${state}` };
        }
    } catch (err: any) {
        checks.mongodb = { status: 'down', message: err.message };
    }

    // ── Redis ─────────────────────────────────────────────────────────────────
    try {
        const redis = getRedis();
        const start = Date.now();
        await redis.ping();
        checks.redis = { status: 'ok', latencyMs: Date.now() - start };
    } catch (err: any) {
        checks.redis = { status: 'degraded', message: 'Redis unavailable — caching disabled' };
    }

    // ── Stripe ────────────────────────────────────────────────────────────────
    if (stripe) {
        try {
            const start = Date.now();
            await stripe.balance.retrieve();
            checks.stripe = { status: 'ok', latencyMs: Date.now() - start };
        } catch (err: any) {
            checks.stripe = { status: 'degraded', message: `Stripe API: ${err.message}` };
        }
    } else {
        checks.stripe = { status: 'degraded', message: 'STRIPE_SECRET_KEY not configured' };
    }

    const statuses = Object.values(checks).map(c => c.status);
    const overallStatus: ServiceStatus = statuses.includes('down')
        ? 'down'
        : statuses.includes('degraded')
            ? 'degraded'
            : 'ok';

    // Only MongoDB being down makes us fully unhealthy
    const httpStatus = checks.mongodb.status === 'down' ? 503 : 200;

    if (overallStatus !== 'ok') {
        logger.warn('Health check: system degraded', { checks });
    }

    res.status(httpStatus).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: checks,
    });
};
