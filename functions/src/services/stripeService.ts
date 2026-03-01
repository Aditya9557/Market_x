import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export const createConnectAccount = async (
    email: string, type: 'vendor' | 'hero', userId: string
): Promise<{ accountId: string; onboardingUrl: string }> => {
    const account = await stripe.accounts.create({
        type: 'express', email,
        metadata: { platform_user_id: userId, account_type: type },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_type: 'individual',
        business_profile: {
            mcc: type === 'vendor' ? '5499' : '4215',
            product_description: type === 'vendor' ? 'Campus marketplace vendor' : 'Student Hero delivery partner',
        },
    });

    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/stripe/refresh`,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/stripe/complete`,
        type: 'account_onboarding',
    });

    return { accountId: account.id, onboardingUrl: accountLink.url };
};

export const createOnboardingLink = async (accountId: string): Promise<string> => {
    const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/stripe/refresh`,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/stripe/complete`,
        type: 'account_onboarding',
    });
    return link.url;
};

export const getAccountStatus = async (accountId: string) => {
    const account = await stripe.accounts.retrieve(accountId);
    return {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements,
    };
};

export const createDashboardLink = async (accountId: string): Promise<string> => {
    const link = await stripe.accounts.createLoginLink(accountId);
    return link.url;
};

export const createPaymentIntent = async (
    amount: number, currency: string, orderId: string, customerEmail: string
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
    const paymentIntent = await stripe.paymentIntents.create({
        amount, currency,
        metadata: { order_id: orderId },
        receipt_email: customerEmail,
        transfer_group: `ORDER_${orderId}`,
    });
    return { clientSecret: paymentIntent.client_secret!, paymentIntentId: paymentIntent.id };
};

interface SplitParams {
    orderId: string; totalAmount: number;
    vendorAccountId: string; heroAccountId: string;
    vendorAmount: number; heroAmount: number;
}

export const distributeFunds = async (params: SplitParams) => {
    const { orderId, vendorAccountId, heroAccountId, vendorAmount, heroAmount } = params;
    const transferGroup = `ORDER_${orderId}`;
    const results: any = {};

    if (vendorAmount > 0 && vendorAccountId) {
        results.vendorTransfer = await stripe.transfers.create({
            amount: vendorAmount, currency: 'usd', destination: vendorAccountId,
            transfer_group: transferGroup, metadata: { order_id: orderId, recipient_type: 'vendor' },
        });
    }
    if (heroAmount > 0 && heroAccountId) {
        results.heroTransfer = await stripe.transfers.create({
            amount: heroAmount, currency: 'usd', destination: heroAccountId,
            transfer_group: transferGroup, metadata: { order_id: orderId, recipient_type: 'hero' },
        });
    }
    return results;
};

export const createInstantPayout = async (accountId: string, amount: number) => {
    return stripe.payouts.create({ amount, currency: 'usd', method: 'instant' }, { stripeAccount: accountId });
};

export const getAccountBalance = async (accountId: string) => {
    const balance = await stripe.balance.retrieve({ stripeAccount: accountId });
    return {
        available: balance.available.reduce((sum, b) => sum + b.amount, 0),
        pending: balance.pending.reduce((sum, b) => sum + b.amount, 0),
    };
};

export const verifyWebhookSignature = (body: any, signature: string) => {
    return stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
};

export default stripe;
