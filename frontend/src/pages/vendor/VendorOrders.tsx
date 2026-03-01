import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';

const statusFlow = ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered'];

const statusConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
    pending: { color: '#FFCC00', bg: 'rgba(255,204,0,0.1)', border: 'rgba(255,204,0,0.3)', label: '⏳ Pending' },
    confirmed: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)', label: '✓ Confirmed' },
    preparing: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', label: '👨‍🍳 Preparing' },
    ready: { color: '#0F9D58', bg: 'rgba(15,157,88,0.1)', border: 'rgba(15,157,88,0.3)', label: '✅ Ready' },
    dispatched: { color: '#FF6B57', bg: 'rgba(255,107,87,0.1)', border: 'rgba(255,107,87,0.3)', label: '🚀 Out for delivery' },
    delivered: { color: '#0F9D58', bg: 'rgba(15,157,88,0.1)', border: 'rgba(15,157,88,0.3)', label: '✅ Delivered' },
    cancelled: { color: '#D93A3A', bg: 'rgba(217,58,58,0.1)', border: 'rgba(217,58,58,0.3)', label: '✕ Cancelled' },
};

const VendorOrders = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const storeApproved = user?.store?.status === 'approved';
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            const params: any = {};
            if (filter !== 'all') params.status = filter;
            const { data } = await API.get('/vendor/orders', { params });
            setOrders(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); }, [filter]);

    const updateStatus = async (orderId: string, status: string) => {
        setUpdating(orderId + status);
        try {
            await API.put(`/vendor/orders/${orderId}/status`, { status });
            await fetchOrders();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update');
        } finally { setUpdating(null); }
    };

    const getNextStatus = (current: string) => {
        const idx = statusFlow.indexOf(current);
        return idx === -1 || idx >= statusFlow.length - 1 ? null : statusFlow[idx + 1];
    };

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="uh-spinner" />
        </div>
    );

    const filterOptions = ['all', ...statusFlow, 'cancelled'];

    return (
        <div className="uh-page max-w-6xl mx-auto px-6 py-8">

            {/* Pending store alert with Sign Out */}
            {!storeApproved && (
                <div className="mb-6 px-5 py-4 rounded-xl flex items-center justify-between gap-3 text-sm"
                    style={{ background: 'rgba(255,204,0,0.08)', border: '1px solid rgba(255,204,0,0.2)', color: '#FFCC00' }}>
                    <div className="flex items-start gap-3">
                        <span className="text-xl">⏳</span>
                        <div>
                            <p className="font-bold">Store pending admin approval</p>
                            <p className="text-xs opacity-80 mt-0.5">Your store will be visible to students once an admin approves it.</p>
                        </div>
                    </div>
                    <button onClick={() => { logout(); navigate('/login'); }} className="text-xs font-bold px-4 py-2 rounded-lg transition-all"
                        style={{ background: 'rgba(255,204,0,0.15)', border: '1px solid rgba(255,204,0,0.3)', color: '#FFCC00', whiteSpace: 'nowrap' }}>
                        Sign Out
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>
                        Your Orders
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        {orders.length} order{orders.length !== 1 ? 's' : ''} {filter !== 'all' ? `· filtered by "${filter}"` : ''}
                    </p>
                </div>
                <button onClick={fetchOrders} className="uh-btn-ghost px-4 py-2 text-sm">
                    🔄 Refresh
                </button>
            </div>

            {/* Status Filter Pills */}
            <div className="flex gap-2 flex-wrap mb-6">
                {filterOptions.map(status => {
                    const cfg = statusConfig[status];
                    return (
                        <button key={status} onClick={() => setFilter(status)}
                            className={`uh-chip capitalize ${filter === status ? 'active' : ''}`}>
                            {status === 'all' ? '🔢 All' : cfg?.label || status}
                        </button>
                    );
                })}
            </div>

            {orders.length === 0 ? (
                <div className="uh-card text-center py-20">
                    <p className="text-5xl mb-4">🧾</p>
                    <p className="text-xl font-bold text-white mb-2">No orders found</p>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        {filter !== 'all' ? 'Try a different status filter' : 'Orders from customers will appear here'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => {
                        const nextStatus = getNextStatus(order.status);
                        const cfg = statusConfig[order.status] || statusConfig.pending;
                        return (
                            <div key={order._id} className="uh-card p-5">
                                {/* Order Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="text-white font-bold font-mono">{order.orderNumber}</p>
                                            <span className="text-xs font-bold px-3 py-1 rounded-full"
                                                style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                                            👤 {order.user?.name || 'Customer'} · {order.user?.email}
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--uh-text-faint)' }}>
                                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <p className="text-xl font-black" style={{ color: 'var(--uh-green)' }}>
                                        ₹{order.subtotal?.toFixed(0)}
                                    </p>
                                </div>

                                {/* Items */}
                                <div className="rounded-xl p-3 mb-4 space-y-1.5"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--uh-card-border)' }}>
                                    {order.items?.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span style={{ color: 'var(--uh-text-muted)' }}>
                                                {item.name}
                                                <span className="ml-1 text-xs opacity-60">×{item.quantity}</span>
                                            </span>
                                            <span className="font-semibold text-white">₹{(item.price * item.quantity).toFixed(0)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                    <div className="flex gap-2 flex-wrap">
                                        {nextStatus && (
                                            <button
                                                onClick={() => updateStatus(order._id, nextStatus)}
                                                disabled={!!updating}
                                                className="uh-btn-primary px-4 py-2 text-sm capitalize">
                                                {updating === order._id + nextStatus
                                                    ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Updating...</span>
                                                    : `→ Mark as ${nextStatus}`}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => updateStatus(order._id, 'cancelled')}
                                            disabled={!!updating}
                                            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                                            style={{ background: 'rgba(217,58,58,0.08)', border: '1px solid rgba(217,58,58,0.2)', color: '#D93A3A' }}>
                                            Cancel
                                        </button>
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

export default VendorOrders;
