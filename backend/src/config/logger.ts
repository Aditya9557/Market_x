import winston from 'winston';
import * as Sentry from '@sentry/node';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// ─── SENTRY INIT ────────────────────────────────────────────

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
    console.log('✅ Sentry initialized');
} else {
    console.log('ℹ️  Sentry DSN not set — error tracking disabled');
}

export { Sentry };

// ─── WINSTON LOGGER ─────────────────────────────────────────

const logFormat = winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const rid = requestId ? `[${requestId}]` : '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level.toUpperCase()} ${rid} ${message}${extra}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        logFormat,
    ),
    transports: [
        new winston.transports.Console(),
    ],
});

// File transport in production
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
    logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}

export default logger;

// ─── REQUEST ID MIDDLEWARE ──────────────────────────────────

export const requestIdMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
    const reqId = (req.headers['x-request-id'] as string) || uuidv4();
    (req as any).requestId = reqId;
    next();
};

// ─── GLOBAL ERROR HANDLER ───────────────────────────────────

export const globalErrorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    const requestId = (req as any).requestId || 'unknown';

    logger.error(`Unhandled error: ${err.message}`, {
        requestId,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    if (SENTRY_DSN) {
        Sentry.captureException(err, {
            tags: { requestId, path: req.path },
        });
    }

    res.status(500).json({
        message: 'Internal server error',
        requestId,
    });
};

// Catch unhandled rejections and exceptions
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    if (SENTRY_DSN) Sentry.captureException(reason);
});

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`, { stack: err.stack });
    if (SENTRY_DSN) Sentry.captureException(err);
    process.exit(1);
});
