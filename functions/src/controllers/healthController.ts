import { Request, Response } from 'express';

export const healthCheck = (_req: Request, res: Response): void => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        service: 'market-x-cloud-functions',
    });
};
