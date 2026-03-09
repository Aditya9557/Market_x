import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';

const HeroOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchOrders = async () => {
        setLoading(true);
        try { const { data } = await API.get('/hero/available-orders'); setOrders(data); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); }, []);

    const handleAccept = async (orderId: string) => {
        setAccepting(orderId);
        try { await API.post(`/hero/accept/${orderId}`, {}); navigate('/hero/active'); }
        catch (err: any) { alert(err.response?.data?.message || 'Failed to accept'); }
        finally { setAccepting(null); }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="uh-spinner" />
        </div>
    );

    return (
        <div className="uh-page max-w-4xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>
                        Available Orders
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        {orders.length > 0
                            ? `${orders.length} order${orders.length !== 1 ? 's' : ''} waiting for a hero`
                            : 'No orders right now — check back soon'}
                    </p>
                </div>
                <button onClick={fetchOrders} disabled={loading} className="uh-btn-ghost px-4 py-2 text-sm">
                    🔄 Refresh
                </button>
            </div>

            {orders.length === 0 ? (
                <div className="uh-card text-center py-20">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center text-4xl"
                        style={{ background: 'rgba(255,107,87,0.08)', border: '1px solid rgba(255,107,87,0.15)' }}>
                        🎧
                    </div>
                    <p className="text-xl font-bold text-white mb-2">No orders right now</p>
                    <p className="text-sm mb-8" style={{ color: 'var(--uh-text-muted)' }}>
                        Stay online — new orders appear here as they come in!
                    </p>
                    <button onClick={fetchOrders} className="uh-btn-outline px-8 py-2.5">
                        🔄 Refresh
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => {
                        const isReady = order.status === 'ready';
                        return (
                            <div key={order._id} className="uh-card p-5"
                                style={{ borderColor: isReady ? 'rgba(15,157,88,0.3)' : undefined }}>
                                <div className="flex items-start gap-5">
                                    {/* Left: icon */}
                                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                                        style={{
                                            background: isReady ? 'rgba(15,157,88,0.12)' : 'rgba(255,107,87,0.08)',
                                            border: `1px solid ${isReady ? 'rgba(15,157,88,0.3)' : 'rgba(255,107,87,0.15)'}`,
                                        }}>
                                        {isReady ? '✅' : '📦'}
                                    </div>

                                    {/* Middle: details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-bold text-white font-mono">#{order.orderNumber}</span>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                                                style={{
                                                    color: isReady ? '#0F9D58' : '#FFCC00',
                                                    background: isReady ? 'rgba(15,157,88,0.1)' : 'rgba(255,204,0,0.1)',
                                                    border: `1px solid ${isReady ? 'rgba(15,157,88,0.3)' : 'rgba(255,204,0,0.25)'}`,
                                                }}>
                                                {isReady ? '✅ Ready to pick up' : `⏳ ${order.status}`}
                                            </span>
                                        </div>

                                        <p className="text-sm mb-1" style={{ color: 'var(--uh-text-muted)' }}>
                                            📍 <span className="text-white">{order.deliveryAddress || 'Campus address'}</span>
                                        </p>
                                        <p className="text-sm mb-2" style={{ color: 'var(--uh-text-muted)' }}>
                                            👤 <span style={{ color: 'var(--uh-text)' }}>{order.user?.name || 'Student'}</span>
                                            <span className="mx-2">•</span>
                                            🏪 <span style={{ color: 'var(--uh-coral)' }}>{order.store?.name || 'Store'}</span>
                                        </p>

                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-black" style={{ color: 'var(--uh-green)' }}>
                                                ₹{order.total?.toFixed(0)}
                                            </span>
                                            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                                                style={{ background: 'rgba(15,157,88,0.1)', color: 'var(--uh-green)', border: '1px solid rgba(15,157,88,0.25)' }}>
                                                + delivery fee
                                            </span>
                                        </div>

                                        <p className="text-xs mt-2" style={{ color: 'var(--uh-text-faint)' }}>
                                            {new Date(order.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>

                                    {/* Right: Accept button */}
                                    <button
                                        onClick={() => handleAccept(order._id)}
                                        disabled={accepting === order._id}
                                        className="uh-btn-primary px-6 py-3 text-sm shrink-0">
                                        {accepting === order._id
                                            ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Accepting...</span>
                                            : '🦸 Accept'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HeroOrders;
