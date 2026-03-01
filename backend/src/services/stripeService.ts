import Stripe from 'stripe';

/**
 * Stripe Connect Service for 3-way split payments.
 *
 * Flow:
 * 1. Customer pays → money goes to Platform's Stripe account
 * 2. On delivery complete → Platform transfers to Vendor + Hero
 * 3. Platform retains commission
 *
 * SETUP REQUIRED:
 * - Add STRIPE_SECRET_KEY to .env
 * - Add STRIPE_WEBHOOK_SECRET to .env
 * - Add STRIPE_PUBLISHABLE_KEY to .env (for frontend)
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// ─── ACCOUNT ONBOARDING ────────────────────────────────────

/**
 * Create a Stripe Express Connect account for a vendor or hero.
 * Returns the account ID and an onboarding link.
 */
export const createConnectAccount = async (
    email: string,
    type: 'vendor' | 'hero',
    userId: string
): Promise<{ accountId: string; onboardingUrl: string }> => {
    const account = await stripe.accounts.create({
        type: 'express',
        email,
        metadata: {
            platform_user_id: userId,
            account_type: type
        },
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
            mcc: type === 'vendor' ? '5499' : '4215', // Grocery/delivery
            product_description: type === 'vendor'
                ? 'Campus marketplace vendor'
                : 'Student Hero delivery partner'
        }
    });

    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/stripe/refresh`,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/stripe/complete`,
        type: 'account_onboarding',
    });

    return {
        accountId: account.id,
        onboardingUrl: accountLink.url
    };
};

/**
 * Generate a new onboarding link for an existing account
 * (if user didn't finish the first time).
 */
export const createOnboardingLink = async (accountId: string): Promise<string> => {
    const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/stripe/refresh`,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/stripe/complete`,
        type: 'account_onboarding',
    });
    return link.url;
};

/**
 * Check if a Connect account has completed onboarding.
 */
export const getAccountStatus = async (accountId: string) => {
    const account = await stripe.accounts.retrieve(accountId);
    return {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements
    };
};

/**
 * Create a Stripe login link for vendor/hero to access their Express dashboard.
 */
export const createDashboardLink = async (accountId: string): Promise<string> => {
    const link = await stripe.accounts.createLoginLink(accountId);
    return link.url;
};

// ─── PAYMENT PROCESSING ────────────────────────────────────

/**
 * Create a Payment Intent for a customer order.
 * The charge goes to the platform's Stripe account.
 */
export const createPaymentIntent = async (
    amount: number,          // in cents
    currency: string,
    orderId: string,
    customerEmail: string
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata: {
            order_id: orderId,
        },
        receipt_email: customerEmail,
        transfer_group: `ORDER_${orderId}`,
    });

    return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id
    };
};

// ─── 3-WAY SPLIT DISTRIBUTION ──────────────────────────────

interface SplitParams {
    orderId: string;
    totalAmount: number;      // in cents
    vendorAccountId: string;
    heroAccountId: string;
    vendorAmount: number;     // in cents (product cost - platform commission)
    heroAmount: number;       // in cents (delivery fee + tip)
}

/**
 * Distribute funds via Separate Charges and Transfers pattern.
 *
 * Ledger Example:
 *   Customer pays: $20.00 (2000 cents)
 *   Stripe fee:    ~$0.88
 *   Platform gets: $19.12
 *   Transfer to vendor: $14.00 (70% of item cost)
 *   Transfer to hero:    $4.00 (delivery fee + tip)
 *   Platform keeps:      $1.12 (commission)
 */
export const distributeFunds = async (params: SplitParams) => {
    const { orderId, vendorAccountId, heroAccountId, vendorAmount, heroAmount } = params;
    const transferGroup = `ORDER_${orderId}`;

    const results: { vendorTransfer?: any; heroTransfer?: any } = {};

    // Transfer to Vendor
    if (vendorAmount > 0 && vendorAccountId) {
        results.vendorTransfer = await stripe.transfers.create({
            amount: vendorAmount,
            currency: 'usd',
            destination: vendorAccountId,
            transfer_group: transferGroup,
            metadata: {
                order_id: orderId,
                recipient_type: 'vendor'
            }
        });
    }

    // Transfer to Student Hero
    if (heroAmount > 0 && heroAccountId) {
        results.heroTransfer = await stripe.transfers.create({
            amount: heroAmount,
            currency: 'usd',
            destination: heroAccountId,
            transfer_group: transferGroup,
            metadata: {
                order_id: orderId,
                recipient_type: 'hero'
            }
        });
    }

    return results;
};

// ─── INSTANT PAYOUTS ────────────────────────────────────────

/**
 * Trigger an instant payout for a hero to their debit card.
 * Requires the hero's Express account to have instant payouts enabled.
 */
export const createInstantPayout = async (
    accountId: string,
    amount: number  // in cents
) => {
    const payout = await stripe.payouts.create(
        {
            amount,
            currency: 'usd',
            method: 'instant',
        },
        {
            stripeAccount: accountId,
        }
    );

    return payout;
};

/**
 * Get the balance of a Connect account (for hero's "Cash Out" feature).
 */
export const getAccountBalance = async (accountId: string) => {
    const balance = await stripe.balance.retrieve({
        stripeAccount: accountId,
    });

    return {
        available: balance.available.reduce((sum, b) => sum + b.amount, 0),
        pending: balance.pending.reduce((sum, b) => sum + b.amount, 0)
    };
};

export default stripe;
