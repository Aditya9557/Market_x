import logger from '../config/logger';

/**
 * Notification Service — abstraction layer for FCM push + email fallback.
 * 
 * ENV toggles:
 *   NOTIFICATIONS_ENABLED=true|false  (master toggle)
 *   FCM_ENABLED=true|false
 *   EMAIL_ENABLED=true|false
 * 
 * In staging/dev, notifications are logged but not actually sent unless enabled.
 */

const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === 'true';
const FCM_ENABLED = process.env.FCM_ENABLED === 'true';
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

// ─── FCM PUSH NOTIFICATIONS ────────────────────────────────

let firebaseAdmin: any = null;

const initFCM = () => {
    if (!FCM_ENABLED || firebaseAdmin) return;
    try {
        const admin = require('firebase-admin');
        const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            firebaseAdmin = admin;
            logger.info('✅ Firebase Admin initialized for FCM');
        } else {
            logger.info('ℹ️  GOOGLE_APPLICATION_CREDENTIALS not set — FCM disabled');
        }
    } catch (err) {
        logger.warn('⚠️  Firebase Admin init failed:', err);
    }
};

export const sendPushNotification = async (params: {
    fcmToken: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}): Promise<boolean> => {
    if (!NOTIFICATIONS_ENABLED || !FCM_ENABLED) {
        logger.info(`[FCM-DRY] ${params.title}: ${params.body}`);
        return false;
    }

    initFCM();
    if (!firebaseAdmin) return false;

    try {
        await firebaseAdmin.messaging().send({
            token: params.fcmToken,
            notification: {
                title: params.title,
                body: params.body,
            },
            data: params.data,
        });
        logger.info(`FCM sent to ${params.fcmToken.slice(0, 8)}...: ${params.title}`);
        return true;
    } catch (err: any) {
        logger.error(`FCM send failed: ${err.message}`);
        return false;
    }
};

// ─── EMAIL NOTIFICATIONS ────────────────────────────────────

let transporter: any = null;

const initEmail = () => {
    if (!EMAIL_ENABLED || transporter) return;
    try {
        const nodemailer = require('nodemailer');
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        logger.info('✅ Email transporter initialized');
    } catch (err) {
        logger.warn('⚠️  Email transporter init failed:', err);
    }
};

export const sendEmail = async (params: {
    to: string;
    subject: string;
    html: string;
}): Promise<boolean> => {
    if (!NOTIFICATIONS_ENABLED || !EMAIL_ENABLED) {
        logger.info(`[EMAIL-DRY] To: ${params.to} | Subject: ${params.subject}`);
        return false;
    }

    initEmail();
    if (!transporter) return false;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Market_x <noreply@marketx.campus>',
            to: params.to,
            subject: params.subject,
            html: params.html,
        });
        logger.info(`Email sent to ${params.to}: ${params.subject}`);
        return true;
    } catch (err: any) {
        logger.error(`Email send failed: ${err.message}`);
        return false;
    }
};

// ─── HIGH-LEVEL NOTIFICATION HELPERS ────────────────────────

export const notifyOrderReady = async (customerEmail: string, orderNumber: string, fcmToken?: string) => {
    const title = 'Order Ready! 🎉';
    const body = `Your order ${orderNumber} is ready for pickup/delivery.`;

    if (fcmToken) await sendPushNotification({ fcmToken, title, body, data: { type: 'order_ready', orderNumber } });
    await sendEmail({ to: customerEmail, subject: title, html: `<h2>${title}</h2><p>${body}</p>` });
};

export const notifyHeroAssigned = async (customerEmail: string, orderNumber: string, heroName: string, fcmToken?: string) => {
    const title = 'Hero Assigned! 🚀';
    const body = `${heroName} is on the way with your order ${orderNumber}.`;

    if (fcmToken) await sendPushNotification({ fcmToken, title, body, data: { type: 'hero_assigned', orderNumber } });
    await sendEmail({ to: customerEmail, subject: title, html: `<h2>${title}</h2><p>${body}</p>` });
};

export const notifyRefundProcessed = async (customerEmail: string, amount: number, orderNumber: string, fcmToken?: string) => {
    const title = 'Refund Processed 💰';
    const body = `₹${amount.toFixed(0)} has been credited to your wallet for order ${orderNumber}.`;

    if (fcmToken) await sendPushNotification({ fcmToken, title, body, data: { type: 'refund', orderNumber } });
    await sendEmail({ to: customerEmail, subject: title, html: `<h2>${title}</h2><p>${body}</p>` });
};

export const notifyDeliveryComplete = async (customerEmail: string, orderNumber: string, fcmToken?: string) => {
    const title = 'Delivered! ✅';
    const body = `Your order ${orderNumber} has been delivered. Enjoy!`;

    if (fcmToken) await sendPushNotification({ fcmToken, title, body, data: { type: 'delivered', orderNumber } });
    await sendEmail({ to: customerEmail, subject: title, html: `<h2>${title}</h2><p>${body}</p>` });
};
