import { useState, useEffect } from 'react';
import API from '../../api/axios';

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: '⏳ Pending', color: '#FFCC00', bg: 'rgba(255,204,0,0.1)', border: 'rgba(255,204,0,0.3)' },
    confirmed: { label: '✓ Confirmed', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' },
    preparing: { label: '👨‍🍳 Preparing', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)' },
    ready: { label: '✅ Ready', color: '#0F9D58', bg: 'rgba(15,157,88,0.1)', border: 'rgba(15,157,88,0.3)' },
    dispatched: { label: '🚀 Dispatched', color: '#FF6B57', bg: 'rgba(255,107,87,0.1)', border: 'rgba(255,107,87,0.3)' },
    delivered: { label: '✅ Delivered', color: '#0F9D58', bg: 'rgba(15,157,88,0.1)', border: 'rgba(15,157,88,0.3)' },
    cancelled: { label: '✕ Cancelled', color: '#D93A3A', bg: 'rgba(217,58,58,0.1)', border: 'rgba(217,58,58,0.3)' },
};

const statusKeys = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'];

const AdminOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState('parent');
    const [status, setStatus] = useState('all');

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params: any = { type };
            if (status !== 'all') params.status = status;
            const { data } = await API.get('/admin/orders', { params });
            setOrders(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); }, [type, status]);

    return (
        <div className="uh-page max-w-6xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>All Orders</h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        {loading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
                    </p>
                </div>
                <button onClick={fetchOrders} className="uh-btn-ghost px-4 py-2 text-sm">🔄 Refresh</button>
            </div>

            {/* Type Toggle */}
            <div className="flex gap-2 mb-4">
                {[
                    { id: 'parent', label: '📦 Parent Orders' },
                    { id: 'child', label: '🏪 Vendor Orders' },
                ].map(t => (
                    <button key={t.id} onClick={() => setType(t.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${type === t.id ? 'uh-btn-primary' : 'uh-btn-ghost'}`}
                        style={type !== t.id ? {} : {}}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap mb-6">
                {statusKeys.map(s => {
                    const cfg = statusConfig[s];
                    return (
                        <button key={s} onClick={() => setStatus(s)}
                            className={`uh-chip capitalize ${status === s ? 'active' : ''}`}>
                            {s === 'all' ? '🔢 All' : cfg?.label || s}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="uh-spinner" /></div>
            ) : orders.length === 0 ? (
                <div className="uh-card text-center py-20">
                    <p className="text-5xl mb-4">📦</p>
                    <p className="text-xl font-bold text-white mb-1">No orders found</p>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>Try a different type or status filter</p>
                </div>
            ) : (
                <div className="uh-card overflow-hidden">
                    {/* Table header */}
                    <div className={`grid gap-3 px-5 py-3 text-xs`}
                        style={{
                            gridTemplateColumns: type === 'child' ? '1fr 1.2fr 1fr 0.7fr 0.8fr 0.8fr' : '1fr 1.2fr 0.7fr 0.8fr 0.8fr',
                            background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--uh-card-border)'
                        }}>
                        {['Order #', 'Customer', ...(type === 'child' ? ['Store'] : []), 'Total', 'Status', 'Date'].map(h => (
                            <div key={h} className="uh-label">{h}</div>
                        ))}
                    </div>

                    {orders.map((order: any, idx: number) => {
                        const st = statusConfig[order.status] || statusConfig.pending;
                        return (
                            <div key={order._id}
                                className={`grid gap-3 items-center px-5 py-4`}
                                style={{
                                    gridTemplateColumns: type === 'child' ? '1fr 1.2fr 1fr 0.7fr 0.8fr 0.8fr' : '1fr 1.2fr 0.7fr 0.8fr 0.8fr',
                                    borderBottom: idx < orders.length - 1 ? '1px solid var(--uh-card-border)' : 'none'
                                }}>
                                <div className="text-sm text-white font-mono font-bold">{order.orderNumber}</div>
                                <div>
                                    <p className="text-sm text-white font-medium truncate">{order.user?.name || 'Unknown'}</p>
                                    <p className="text-xs truncate" style={{ color: 'var(--uh-text-faint)' }}>{order.user?.email}</p>
                                </div>
                                {type === 'child' && (
                                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--uh-coral)' }}>
                                        {order.store?.name || '—'}
                                    </div>
                                )}
                                <div className="text-sm font-black" style={{ color: 'var(--uh-green)' }}>
                                    ₹{order.total?.toFixed(0)}
                                </div>
                                <div>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                                        {st.label}
                                    </span>
                                </div>
                                <div className="text-xs" style={{ color: 'var(--uh-text-faint)' }}>
                                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
