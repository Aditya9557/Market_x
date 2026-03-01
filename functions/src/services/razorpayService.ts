import Razorpay from 'razorpay';
import crypto from 'crypto';

let _razorpay: Razorpay | null = null;

const getRazorpay = (): Razorpay => {
    if (!_razorpay) {
        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        if (!key_id || !key_secret) {
            throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
        }
        _razorpay = new Razorpay({ key_id, key_secret });
    }
    return _razorpay;
};

export const createRazorpayOrder = async (
    amountInPaise: number, receiptId: string
): Promise<{ id: string; amount: number; currency: string }> => {
    const order = await getRazorpay().orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId.slice(0, 40),
    });
    return { id: order.id, amount: order.amount as number, currency: order.currency };
};

export const verifyPaymentSignature = (
    razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string
): boolean => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
    return expectedSignature === razorpaySignature;
};
