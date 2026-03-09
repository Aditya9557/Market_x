import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../api/axios';
import useRazorpay from '../../hooks/useRazorpay';
import { useAuth } from '../../context/AuthContext';

interface CartItem {
    product: { _id: string; name: string; price: number; images: string[]; store: { _id: string; name: string } };
    quantity: number; priceAtAdd: number;
}
interface Cart { _id: string; items: CartItem[]; }

const Checkout = () => {
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState(false);
    const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'wallet'>('razorpay');
    const [walletBalance, setWalletBalance] = useState(0);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { openRazorpay } = useRazorpay();

    useEffect(() => {
        const fetchCart = async () => {
            try {
                const { data } = await API.get('/cart'); setCart(data);
                if (!data?.items?.length) navigate('/cart');
            } catch { navigate('/cart'); }
            finally { setLoading(false); }
        };
        const fetchWallet = async () => {
            try { const { data } = await API.get('/user/wallet'); setWalletBalance(data.balance || 0); } catch { }
        };
        fetchCart();
        fetchWallet();
    }, [navigate]);

    const items = cart?.items || [];
    const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const deliveryFee = orderType === 'delivery' ? 3.00 : 0;
    const total = subtotal + deliveryFee;

    const grouped = items.reduce((acc, item) => {
        const id = item.product.store?._id || 'unknown';
        const name = item.product.store?.name || 'Unknown Store';
        if (!acc[id]) acc[id] = { name, items: [] };
        acc[id].items.push(item);
        return acc;
    }, {} as Record<string, { name: string; items: CartItem[] }>);

    const handlePlaceOrder = async () => {
        setError('');
        if (orderType === 'delivery' && !deliveryAddress.trim()) { setError('Please enter a delivery address'); return; }
        setPlacing(true);

        try {
            // Step 1: Create the order
            const { data } = await API.post('/orders', {
                orderType,
                deliveryAddress: orderType === 'delivery' ? deliveryAddress : 'Self Pickup',
                notes
            });
            const orderId = data.parentOrder?._id;

            if (paymentMethod === 'wallet') {
                // Wallet pay: order already created, mark paid via wallet deduct
                if (walletBalance < total) { setError(`Insufficient wallet balance (₹${walletBalance.toFixed(0)}). Add money first.`); setPlacing(false); return; }
                await API.post('/payments/razorpay/wallet/deduct', { orderId, amount: total }).catch(() => { });
                navigate('/orders', { state: { success: `Order placed! Paid from wallet.` } });
            } else {
                // Razorpay pay
                if (!orderId) { navigate('/orders', { state: { success: data.message } }); return; }
                const { data: rzpOrder } = await API.post('/payments/razorpay/create-order', { orderId });
                openRazorpay({
                    razorpayOrderId: rzpOrder.razorpayOrderId,
                    amount: rzpOrder.amount,
                    currency: rzpOrder.currency,
                    keyId: rzpOrder.keyId,
                    name: 'Market X Order',
                    description: `Order #${data.parentOrder?.orderNumber}`,
                    prefill: { name: user?.name, email: user?.email },
                    onSuccess: async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
                        try {
                            await API.post('/payments/razorpay/verify', { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature });
                            navigate('/orders', { state: { success: `Order placed & payment confirmed! 🎉` } });
                        } catch { navigate('/orders', { state: { success: `Order placed! Payment confirmation pending.` } }); }
                    },
                    onError: (err) => {
                        setError('Payment failed: ' + (typeof err === 'string' ? err : 'Please try again'));
                        setPlacing(false);
                    },
                    onDismiss: () => setPlacing(false),
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to place order');
            setPlacing(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center py-32"><div className="uh-spinner" /></div>;

    return (
        <div className="uh-page max-w-4xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link to="/cart" className="uh-btn-ghost px-4 py-2 text-sm">← Cart</Link>
                <div>
                    <h1 className="text-3xl font-black text-white" style={{ letterSpacing: '-0.5px' }}>Checkout</h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        {items.length} item{items.length !== 1 ? 's' : ''} from {Object.keys(grouped).length} store{Object.keys(grouped).length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(217,58,58,0.1)', border: '1px solid rgba(217,58,58,0.3)', color: 'var(--uh-error)' }}>
                    ⚠️ {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Order Type Selection */}
                    <div className="uh-card p-6">
                        <h3 className="text-base font-bold text-white mb-4">🚀 Order Type</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { type: 'delivery', emoji: '🚴', title: 'Delivery', sub: 'A Student Hero delivers to you', fee: '+₹3.00 fee', feeColor: 'var(--uh-coral)' },
                                { type: 'takeaway', emoji: '🏪', title: 'Takeaway', sub: 'Pick up from the store yourself', fee: 'Free pickup', feeColor: 'var(--uh-green)' },
                            ].map(opt => {
                                const isActive = orderType === opt.type;
                                const accentColor = opt.type === 'delivery' ? 'var(--uh-coral)' : 'var(--uh-green)';
                                return (
                                    <button key={opt.type} id={`order-type-${opt.type}`}
                                        onClick={() => setOrderType(opt.type as any)}
                                        className="relative p-5 rounded-xl text-left transition-all duration-200"
                                        style={{
                                            border: `2px solid ${isActive ? accentColor : 'var(--uh-card-border)'}`,
                                            background: isActive ? `${accentColor}10` : 'rgba(255,255,255,0.02)',
                                            boxShadow: isActive ? `0 0 20px ${accentColor}15` : 'none',
                                        }}>
                                        {isActive && (
                                            <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                                style={{ background: accentColor }}>✓</span>
                                        )}
                                        <p className="text-3xl mb-2">{opt.emoji}</p>
                                        <p className="font-bold text-white text-base">{opt.title}</p>
                                        <p className="text-xs mt-1 mb-2" style={{ color: 'var(--uh-text-muted)' }}>{opt.sub}</p>
                                        <p className="text-xs font-bold" style={{ color: opt.feeColor }}>{opt.fee}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery Address */}
                    {orderType === 'delivery' && (
                        <div className="uh-card p-6">
                            <h3 className="text-base font-bold text-white mb-4">📍 Delivery Address</h3>
                            <input id="delivery-address" type="text"
                                placeholder="e.g. Room 302, Building B, Main Campus"
                                value={deliveryAddress}
                                onChange={e => setDeliveryAddress(e.target.value)}
                                className="uh-input" required />
                            <p className="text-xs mt-2" style={{ color: 'var(--uh-text-faint)' }}>
                                Be specific so the Hero can find you easily 🗺️
                            </p>
                        </div>
                    )}

                    {/* Takeaway Locations */}
                    {orderType === 'takeaway' && (
                        <div className="uh-card p-6">
                            <h3 className="text-base font-bold text-white mb-4">🏪 Pickup Location(s)</h3>
                            <div className="space-y-3">
                                {Object.entries(grouped).map(([storeId, group]) => (
                                    <div key={storeId} className="flex items-center gap-3 p-3 rounded-xl"
                                        style={{ background: 'rgba(15,157,88,0.06)', border: '1px solid rgba(15,157,88,0.2)' }}>
                                        <span className="text-2xl">📍</span>
                                        <div>
                                            <p className="text-sm font-bold text-white">{group.name}</p>
                                            <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                                {group.items.length} item{group.items.length !== 1 ? 's' : ''} · Pick up when ready
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs mt-3" style={{ color: 'var(--uh-text-faint)' }}>
                                You'll be notified when your order is ready for pickup
                            </p>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="uh-card p-6">
                        <h3 className="text-base font-bold text-white mb-4">📝 Special Instructions</h3>
                        <textarea id="order-notes"
                            placeholder="Any special instructions? (optional)"
                            value={notes} rows={3}
                            onChange={e => setNotes(e.target.value)}
                            className="uh-input" style={{ resize: 'none' }} />
                    </div>
                </div>

                {/* Right: Order Summary */}
                <div className="uh-card p-6 h-fit sticky top-4">
                    <h3 className="text-base font-bold text-white mb-4">Order Summary</h3>

                    <div className="space-y-1.5 mb-4 max-h-52 overflow-y-auto">
                        {items.map(item => (
                            <div key={item.product._id} className="flex justify-between text-sm">
                                <span className="truncate mr-2" style={{ color: 'var(--uh-text-muted)' }}>
                                    {item.quantity}× {item.product.name}
                                </span>
                                <span className="text-white font-medium whitespace-nowrap">
                                    ₹{(item.product.price * item.quantity).toFixed(0)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="uh-divider my-3" />

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between" style={{ color: 'var(--uh-text-muted)' }}>
                            <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between" style={{ color: 'var(--uh-text-muted)' }}>
                            <span>{orderType === 'delivery' ? '🚴 Delivery Fee' : '🏪 Pickup'}</span>
                            <span style={{ color: deliveryFee === 0 ? 'var(--uh-green)' : undefined }}>
                                {deliveryFee === 0 ? 'Free' : `₹${deliveryFee.toFixed(0)}`}
                            </span>
                        </div>
                        <div className="uh-divider my-2" />
                        <div className="flex justify-between text-white font-black text-lg">
                            <span>Total</span>
                            <span style={{ color: 'var(--uh-green)' }}>₹{total.toFixed(0)}</span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="uh-card p-6">
                        <h3 className="text-base font-bold text-white mb-4">💳 Payment Method</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'razorpay', emoji: '📲', title: 'Razorpay', sub: 'UPI · Cards · Net Banking', accent: 'var(--uh-coral)' },
                                { id: 'wallet', emoji: '👜', title: 'Wallet', sub: `Balance: ₹${walletBalance.toFixed(0)}`, accent: '#a78bfa', disabled: walletBalance < total },
                            ].map(opt => {
                                const isActive = paymentMethod === opt.id;
                                return (
                                    <button key={opt.id}
                                        onClick={() => !opt.disabled && setPaymentMethod(opt.id as any)}
                                        disabled={opt.disabled}
                                        className="relative p-5 rounded-xl text-left transition-all duration-200 disabled:opacity-40"
                                        style={{
                                            border: `2px solid ${isActive ? opt.accent : 'var(--uh-card-border)'}`,
                                            background: isActive ? `${opt.accent}15` : 'rgba(255,255,255,0.02)',
                                        }}>
                                        {isActive && <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: opt.accent }}>✓</span>}
                                        <p className="text-3xl mb-2">{opt.emoji}</p>
                                        <p className="font-bold text-white text-base">{opt.title}</p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--uh-text-muted)' }}>{opt.sub}</p>
                                        {opt.disabled && <p className="text-xs font-semibold mt-1" style={{ color: 'var(--uh-error)' }}>Insufficient balance</p>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button id="place-order-btn" onClick={handlePlaceOrder} disabled={placing}
                        className="uh-btn-primary w-full mt-4 py-3.5 text-base">
                        {placing
                            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</span>
                            : paymentMethod === 'wallet'
                                ? `Pay ₹${total.toFixed(0)} from Wallet`
                                : `Pay ₹${total.toFixed(0)} via Razorpay`
                        }
                    </button>

                    <p className="text-xs text-center mt-3" style={{ color: 'var(--uh-text-faint)' }}>
                        {orderType === 'delivery'
                            ? '📦 Orders split per vendor — a Hero picks up from each store'
                            : "✅ You'll pick up directly from the store(s) when ready"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
