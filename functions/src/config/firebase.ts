import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (auto-detects credentials in Cloud Functions)
if (!admin.apps.length) {
    admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();

// Collection references
export const collections = {
    users: db.collection('users'),
    stores: db.collection('stores'),
    products: db.collection('products'),
    orders: db.collection('orders'),
    carts: db.collection('carts'),
    deliveries: db.collection('deliveries'),
    deliveryDrivers: db.collection('deliveryDrivers'),
    driverLocations: db.collection('driverLocations'),
    deliveryTracking: db.collection('deliveryTracking'),
    disputes: db.collection('disputes'),
    heroApplications: db.collection('heroApplications'),
    heroRatings: db.collection('heroRatings'),
    ledgerEntries: db.collection('ledgerEntries'),
    adminActionLogs: db.collection('adminActionLogs'),
    campusConfigs: db.collection('campusConfigs'),
    campusPOIs: db.collection('campusPOIs'),
    reconciliationReports: db.collection('reconciliationReports'),
    riskFlags: db.collection('riskFlags'),
    contactMessages: db.collection('contactMessages'),
    transactions: db.collection('transactions'),
    webhookEvents: db.collection('webhookEvents'),
};

export default admin;
