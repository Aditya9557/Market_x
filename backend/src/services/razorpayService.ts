import Razorpay from 'razorpay';
import crypto from 'crypto';

/**
 * Razorpay Service — handles order creation and payment verification.
 * Lazily initialized to avoid crashing on startup when keys aren't set yet.
 *
 * Required env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */

let _razorpay: Razorpay | null = null;

const getRazorpay = (): Razorpay => {
    if (!_razorpay) {
        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        if (!key_id || !key_secret) {
            throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env');
        }
        _razorpay = new Razorpay({ key_id, key_secret });
    }
    return _razorpay;
};

/**
 * Create a Razorpay Order.
 * @param amountInPaise – amount in smallest currency unit (1 INR = 100 paise)
 * @param receiptId     – unique receipt ID (your internal order/transaction ID)
 */
export const createRazorpayOrder = async (
    amountInPaise: number,
    receiptId: string
): Promise<{ id: string; amount: number; currency: string }> => {
    const order = await getRazorpay().orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId.slice(0, 40), // Razorpay receipt max 40 chars
    });

    return {
        id: order.id,
        amount: order.amount as number,
        currency: order.currency,
    };
};

/**
 * Verify Razorpay payment signature.
 * Must be called after the customer completes payment on the frontend.
 */
export const verifyPaymentSignature = (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
): boolean => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

    return expectedSignature === razorpaySignature;
};
