#!/usr/bin/env node
/**
 * UniHeart — Production Migration v2 Script
 * Seeds CampusConfig and creates MongoDB indexes for new production collections.
 * 
 * Run: npx ts-node src/scripts/migrate-v2.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CampusConfig from '../models/CampusConfig';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/market_x';

async function migrate() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to', MONGO_URI.replace(/:\/\/.*@/, '://***@'));

    const db = mongoose.connection.db!;

    // ── 1. Ensure indexes ────────────────────────────────────────────────────
    console.log('\n📋 Creating indexes...');

    await db.collection('adminactionlogs').createIndexes([
        { key: { createdAt: -1 }, background: true } as any,
        { key: { adminId: 1, createdAt: -1 }, background: true } as any,
        { key: { actionType: 1, createdAt: -1 }, background: true } as any,
    ]);
    console.log('  ✅ AdminActionLog indexes created');

    await db.collection('riskflags').createIndexes([
        { key: { resolved: 1, severity: 1, createdAt: -1 }, background: true } as any,
        { key: { userId: 1, reason: 1 }, background: true } as any,
        { key: { ipAddress: 1 }, background: true } as any,
    ]);
    console.log('  ✅ RiskFlag indexes created');

    await db.collection('reconciliationreports').createIndexes([
        { key: { date: -1 }, unique: true, background: true } as any,
        { key: { status: 1, date: -1 }, background: true } as any,
    ]);
    console.log('  ✅ ReconciliationReport indexes created');

    await db.collection('campusconfigs').createIndexes([
        { key: { campusId: 1 }, unique: true, background: true } as any,
    ]);
    console.log('  ✅ CampusConfig indexes created');

    // ── 2. Seed default campus config ────────────────────────────────────────
    console.log('\n🏫 Seeding default campus config...');
    const existingConfig = await CampusConfig.findOne({ campusId: 'campus_main' });

    if (existingConfig) {
        console.log('  ⏭️  campus_main already exists — skipping seed');
    } else {
        await CampusConfig.create({
            campusId: 'campus_main',
            name: 'Main Campus',
            isActive: true,
            baseFee: 15,
            perKmRate: 5,
            maxDeliveryRadius: 5,
            platformCommission: 10,
            heroCommission: 70,
            maxRefundPerWeek: 500,
            minOrderValue: 50,
            features: {
                heroDelivery: true,
                campusGuide: true,
                uniGuide: true,
                walletTopup: true,
                guestCheckout: false,
                disputeCenter: true,
            },
            minReliabilityScore: 2.0,
            autosuspendThreshold: 30,
        });
        console.log('  ✅ Created campus_main with default settings');
    }

    // ── 3. Verify ────────────────────────────────────────────────────────────
    console.log('\n📊 Verification:');
    const colls = ['adminactionlogs', 'riskflags', 'reconciliationreports', 'campusconfigs'];
    for (const coll of colls) {
        const count = await db.collection(coll).countDocuments();
        const idxCount = (await db.collection(coll).listIndexes().toArray()).length;
        console.log(`  ${coll}: ${count} docs, ${idxCount} indexes`);
    }

    console.log('\n🎉 Migration v2 complete!\n');
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
