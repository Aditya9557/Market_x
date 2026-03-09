import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';

interface ChildOrder {
    _id: string; orderNumber: string;
    store: { _id: string; name: string };
    status: string; subtotal: number;
    items: { name: string; price: number; quantity: number }[];
}
interface Order {
    _id: string; orderNumber: string; total: number;
    status: string; paymentStatus: string; deliveryAddress: string;
    createdAt: string; childOrders: ChildOrder[];
}

const statusConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
    pending: { color: '#FFCC00', bg: 'rgba(255,204,0,0.08)', border: 'rgba(255,204,0,0.25)', label: '⏳ Pending' },
    confirmed: { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)', label: '✓ Confirmed' },
    preparing: { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)', label: '👨‍🍳 Preparing' },
    ready: { color: '#0F9D58', bg: 'rgba(15,157,88,0.08)', border: 'rgba(15,157,88,0.25)', label: '✅ Ready' },
    dispatched: { color: '#FF6B57', bg: 'rgba(255,107,87,0.08)', border: 'rgba(255,107,87,0.25)', label: '🚀 On way' },
    delivered: { color: '#0F9D58', bg: 'rgba(15,157,88,0.08)', border: 'rgba(15,157,88,0.25)', label: '✅ Delivered' },
    cancelled: { color: '#D93A3A', bg: 'rgba(217,58,58,0.08)', border: 'rgba(217,58,58,0.25)', label: '✕ Cancelled' },
};

const OrderHistory = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try { const { data } = await API.get('/orders/my'); setOrders(data); }
            catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="uh-spinner" />
        </div>
    );

    return (
        <div className="uh-page max-w-4xl mx-auto px-6 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>Order History</h1>
                <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
            </div>

            {orders.length === 0 ? (
                <div className="uh-card text-center py-20">
                    <p className="text-6xl mb-4">📦</p>
                    <p className="text-xl font-bold text-white mb-2">No orders yet</p>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>Your order history will appear here</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => {
                        const st = statusConfig[order.status] || statusConfig.pending;
                        const isOpen = expanded === order._id;
                        return (
                            <div key={order._id} className="uh-card overflow-hidden">
                                {/* Order Header Row */}
                                <div
                                    className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
                                    style={{ borderBottom: isOpen ? '1px solid var(--uh-card-border)' : 'none' }}
                                    onClick={() => setExpanded(isOpen ? null : order._id)}>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-bold text-white"
                                            style={{ background: 'rgba(255,107,87,0.12)', border: '1px solid rgba(255,107,87,0.2)' }}>
                                            🧾
                                        </div>
                                        <div>
                                            <p className="text-white font-bold font-mono text-sm">{order.orderNumber}</p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--uh-text-muted)' }}>
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {['confirmed', 'preparing', 'ready', 'dispatched', 'hero_assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                                            <Link
                                                to={`/track/${order._id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105"
                                                style={{
                                                    color: '#FF6B57',
                                                    background: 'rgba(255,107,87,0.1)',
                                                    border: '1px solid rgba(255,107,87,0.3)',
                                                }}
                                            >
                                                Track 📍
                                            </Link>
                                        )}
                                        <span className="text-xs font-bold px-3 py-1 rounded-full"
                                            style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                                            {st.label}
                                        </span>
                                        <span className="text-base font-black" style={{ color: 'var(--uh-green)' }}>
                                            ₹{order.total.toFixed(0)}
                                        </span>
                                        <span className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                                            {isOpen ? '▲' : '▼'}
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isOpen && (
                                    <div className="px-5 pb-5 pt-3">
                                        {order.deliveryAddress && (
                                            <p className="text-sm mb-4 flex items-start gap-2" style={{ color: 'var(--uh-text-muted)' }}>
                                                <span>📍</span><span>{order.deliveryAddress}</span>
                                            </p>
                                        )}

                                        <div className="space-y-3">
                                            {order.childOrders?.map(child => {
                                                const cst = statusConfig[child.status] || statusConfig.pending;
                                                return (
                                                    <div key={child._id} className="rounded-xl overflow-hidden"
                                                        style={{ border: '1px solid var(--uh-card-border)' }}>
                                                        <div className="flex items-center justify-between px-4 py-2.5"
                                                            style={{ background: 'rgba(255,107,87,0.05)', borderBottom: '1px solid var(--uh-card-border)' }}>
                                                            <span className="text-sm font-bold" style={{ color: 'var(--uh-coral)' }}>
                                                                🏪 {child.store?.name}
                                                            </span>
                                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                                style={{ color: cst.color, background: cst.bg, border: `1px solid ${cst.border}` }}>
                                                                {cst.label}
                                                            </span>
                                                        </div>
                                                        <div className="px-4 py-3 space-y-2">
                                                            {child.items?.map((item, i) => (
                                                                <div key={i} className="flex justify-between text-sm">
                                                                    <span style={{ color: 'var(--uh-text-muted)' }}>
                                                                        {item.name}
                                                                        <span className="ml-1 text-xs opacity-60">×{item.quantity}</span>
                                                                    </span>
                                                                    <span className="font-semibold text-white">
                                                                        ₹{(item.price * item.quantity).toFixed(0)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            <div className="uh-divider" />
                                                            <div className="flex justify-between text-sm font-bold">
                                                                <span style={{ color: 'var(--uh-text-muted)' }}>Subtotal</span>
                                                                <span style={{ color: 'var(--uh-green)' }}>₹{child.subtotal?.toFixed(0)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default OrderHistory;
