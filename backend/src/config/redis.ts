import Redis from 'ioredis';

let redis: Redis | null = null;

export const getRedis = (): Redis => {
    if (!redis) {
        const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        redis = new Redis(url, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 5) return null; // stop retrying
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
        });

        redis.on('connect', () => console.log('✅ Redis connected'));
        redis.on('error', (err) => console.warn('⚠️  Redis error:', err.message));
    }
    return redis;
};

/**
 * Attempt to connect Redis. Non-fatal if it fails — features degrade gracefully.
 */
export const connectRedis = async (): Promise<boolean> => {
    try {
        const r = getRedis();
        await r.connect();
        return true;
    } catch (err) {
        console.warn('⚠️  Redis not available. Redis-backed features (locks, rate-limit, idempotency) will fall back to in-memory.');
        return false;
    }
};

/**
 * SETNX-based distributed lock with TTL.
 * Returns true if lock acquired, false otherwise.
 */
export const acquireLock = async (key: string, ttlMs: number = 10000): Promise<boolean> => {
    try {
        const r = getRedis();
        const result = await r.set(key, '1', 'PX', ttlMs, 'NX');
        return result === 'OK';
    } catch {
        // If Redis is down, allow the operation (fail-open for non-critical, fail-closed for critical)
        return true;
    }
};

export const releaseLock = async (key: string): Promise<void> => {
    try {
        const r = getRedis();
        await r.del(key);
    } catch { /* noop */ }
};

/**
 * Idempotency check — returns true if this ID has already been processed.
 */
export const isProcessed = async (key: string): Promise<boolean> => {
    try {
        const r = getRedis();
        const exists = await r.exists(key);
        return exists === 1;
    } catch {
        return false;
    }
};

/**
 * Mark an event/ID as processed with expiry.
 */
export const markProcessed = async (key: string, ttlSeconds: number = 86400 * 7): Promise<void> => {
    try {
        const r = getRedis();
        await r.set(key, '1', 'EX', ttlSeconds);
    } catch { /* noop */ }
};

export default getRedis;
