/**
 * useRazorpay hook
 * Dynamically loads the Razorpay checkout script and exposes an openRazorpay function.
 */

import { useEffect, useRef } from 'react';

interface RazorpayOptions {
    razorpayOrderId: string;
    amount: number;          // in paise
    currency: string;
    keyId: string;
    name?: string;
    description?: string;
    prefill?: {
        name?: string;
        email?: string;
    };
    onSuccess: (response: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => void;
    onError?: (error: any) => void;
    onDismiss?: () => void;
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise(resolve => {
        if ((window as any).Razorpay) {
            resolve(true);
            return;
        }
        const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve(true));
            existing.addEventListener('error', () => resolve(false));
            return;
        }
        const script = document.createElement('script');
        script.src = RAZORPAY_SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
};

const useRazorpay = () => {
    const loaded = useRef(false);

    useEffect(() => {
        loadRazorpayScript().then(ok => { loaded.current = ok; });
    }, []);

    const openRazorpay = async (options: RazorpayOptions) => {
        const ok = await loadRazorpayScript();
        if (!ok) {
            options.onError?.('Failed to load Razorpay SDK. Check your internet connection.');
            return;
        }

        const rzp = new (window as any).Razorpay({
            key: options.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
            order_id: options.razorpayOrderId,
            amount: options.amount,
            currency: options.currency || 'INR',
            name: options.name || 'Market X',
            description: options.description || 'Payment',
            prefill: {
                name: options.prefill?.name || '',
                email: options.prefill?.email || '',
            },
            theme: { color: '#FF6B57' },
            modal: {
                ondismiss: () => options.onDismiss?.(),
            },
            handler: (response: any) => {
                options.onSuccess({
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                });
            },
        });

        rzp.on('payment.failed', (res: any) => {
            options.onError?.(res.error?.description || 'Payment failed');
        });

        rzp.open();
    };

    return { openRazorpay };
};

export default useRazorpay;
