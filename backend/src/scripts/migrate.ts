/**
 * Migration script for production-grade improvements.
 * Run: npm run migrate
 * 
 * Creates indexes for new models and verifies existing ones.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db';

// Import all models to register their schemas
import '../models/User';
import '../models/Store';
import '../models/Product';
import '../models/Order';
import '../models/Cart';
import '../models/Delivery';
import '../models/DeliveryDriver';
import '../models/Transaction';
import '../models/ContactMessage';
import '../models/CampusPOI';
import '../models/Dispute';
import '../models/HeroRating';
import '../models/LedgerEntry';
import '../models/RefreshToken';
import '../models/WebhookEvent';

const migrate = async () => {
    console.log('🔄 Starting migration...\n');

    await connectDB();

    // Sync all model indexes
    const models = mongoose.modelNames();
    for (const modelName of models) {
        const model = mongoose.model(modelName);
        try {
            await model.syncIndexes();
            console.log(`  ✅ ${modelName} — indexes synced`);
        } catch (err: any) {
            console.error(`  ❌ ${modelName} — index sync failed: ${err.message}`);
        }
    }

    console.log(`\n✅ Migration complete. ${models.length} models processed.`);
    console.log('\nNew models added:');
    console.log('  • Dispute      — order disputes with resolution workflow');
    console.log('  • HeroRating   — individual delivery ratings');
    console.log('  • LedgerEntry  — immutable wallet transaction ledger');
    console.log('  • RefreshToken — JWT refresh token rotation');
    console.log('  • WebhookEvent — Stripe webhook idempotency log');

    process.exit(0);
};

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
