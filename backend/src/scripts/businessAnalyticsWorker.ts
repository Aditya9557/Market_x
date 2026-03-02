import cron from 'node-cron';
import { computeDailySnapshot } from '../services/founderAnalyticsService';
import { processRetentionTriggers } from '../services/retentionService';
import logger from '../config/logger';

/**
 * Business Analytics Worker — nightly cron jobs.
 * - 01:00 UTC: Compute daily business snapshot
 * - 09:00 UTC (2:30 PM IST): Run retention triggers
 */

export const startBusinessAnalyticsCron = () => {
    // Nightly KPI snapshot at 01:00 UTC
    cron.schedule('0 1 * * *', async () => {
        try {
            logger.info('Running nightly business analytics snapshot...');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            await computeDailySnapshot(yesterday);
            logger.info('Business analytics snapshot completed');
        } catch (err: any) {
            logger.error('Business analytics cron failed', { error: err.message });
        }
    });

    // Retention triggers at 09:00 UTC (2:30 PM IST)
    cron.schedule('0 9 * * *', async () => {
        try {
            logger.info('Running retention triggers...');
            const result = await processRetentionTriggers();
            logger.info(`Retention engine completed: ${result.processed} actions`);
        } catch (err: any) {
            logger.error('Retention cron failed', { error: err.message });
        }
    });

    logger.info('Business analytics cron registered (01:00 UTC snapshot, 09:00 UTC retention)');
};
