import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';

const statusStyle: Record<string, { color: string; badge: string }> = {
    pending: { color: 'var(--uh-yellow)', badge: 'uh-badge-yellow' },
    confirmed: { color: '#60a5fa', badge: '' },
    preparing: { color: '#a78bfa', badge: '' },
    ready: { color: 'var(--uh-green)', badge: 'uh-badge-green' },
    dispatched: { color: 'var(--uh-coral)', badge: 'uh-badge-coral' },
    delivered: { color: 'var(--uh-green)', badge: 'uh-badge-green' },
    cancelled: { color: 'var(--uh-error)', badge: '' },
};

const VendorDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, pendingOrders: 0, revenue: 0 });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [pRes, oRes] = await Promise.all([API.get('/vendor/products'), API.get('/vendor/orders')]);
                const products = pRes.data;
                const orders = oRes.data;
                setStats({
                    totalProducts: products.length,
                    totalOrders: orders.length,
                    pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
                    revenue: orders.filter((o: any) => o.status !== 'cancelled').reduce((s: number, o: any) => s + o.subtotal, 0),
                });
                setRecentOrders(orders.slice(0, 5));
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="uh-spinner" />
        </div>
    );

    const storeApproved = user?.store?.status === 'approved';

    return (
        <div className="uh-page max-w-6xl mx-auto px-6 py-8">

            {/* Welcome Banner */}
            <div className="rounded-2xl p-6 mb-8 overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, rgba(255,107,87,0.15) 0%, rgba(255,59,92,0.08) 100%)', border: '1px solid rgba(255,107,87,0.2)' }}>
                <div className="absolute right-6 top-4 text-6xl opacity-10 select-none">🏪</div>
                <div className="relative z-10">
                    <p className="uh-label mb-2" style={{ color: 'rgba(255,107,87,0.7)' }}>Vendor Dashboard</p>
                    <h1 className="text-3xl font-black text-white mb-2">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                            Store: <span className="text-white font-semibold">{user?.store?.name || 'N/A'}</span>
                        </span>
                        <span className={storeApproved ? 'uh-badge-green' : 'uh-badge-yellow'}>
                            {storeApproved ? '✓ Approved' : '⏳ Pending'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Pending alert */}
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

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Products Listed', value: stats.totalProducts, icon: '📦', color: 'var(--uh-coral)' },
                    { label: 'Total Orders', value: stats.totalOrders, icon: '🧾', color: '#60a5fa' },
                    { label: 'Pending Orders', value: stats.pendingOrders, icon: '⏰', color: 'var(--uh-yellow)' },
                    { label: 'Total Revenue', value: `₹${stats.revenue.toFixed(0)}`, icon: '💰', color: 'var(--uh-green)' },
                ].map((s, i) => (
                    <div key={i} className="uh-card p-5">
                        <p className="text-2xl mb-2">{s.icon}</p>
                        <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--uh-text-muted)' }}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Actions + Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Quick Actions */}
                <div className="uh-card p-6">
                    <h3 className="font-bold text-white mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                        {[
                            { to: '/vendor/products', icon: '📦', label: 'Manage Products', desc: 'Add, edit or remove' },
                            { to: '/vendor/orders', icon: '🧾', label: 'View Orders', desc: 'Process pending orders' },
                            { to: '/vendor/settings', icon: '⚙️', label: 'Store Settings', desc: 'Update info & Uni Guide' },
                            { to: '/campus-guide', icon: '🗺️', label: 'Uni Guide', desc: 'See your campus presence' },
                        ].map(a => (
                            <Link key={a.to} to={a.to}
                                className="flex items-center gap-3 p-3 rounded-xl transition-all group"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,87,0.07)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}>
                                <span className="text-2xl">{a.icon}</span>
                                <div>
                                    <p className="text-white text-sm font-semibold">{a.label}</p>
                                    <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>{a.desc}</p>
                                </div>
                                <span className="ml-auto text-xs" style={{ color: 'var(--uh-coral)', opacity: 0 }}
                                    ref={el => { if (el) el.parentElement!.addEventListener('mouseenter', () => el.style.opacity = '1'); el?.parentElement?.addEventListener('mouseleave', () => { if (el) el.style.opacity = '0'; }); }}>→</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="lg:col-span-2 uh-card p-6">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="font-bold text-white">Recent Orders</h3>
                        <Link to="/vendor/orders" className="text-sm font-semibold" style={{ color: 'var(--uh-coral)' }}>View All →</Link>
                    </div>
                    {recentOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-4xl mb-3">🧾</p>
                            <p className="font-semibold text-white">No orders yet</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--uh-text-muted)' }}>Orders will appear here when customers buy.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentOrders.map((order: any) => {
                                const st = statusStyle[order.status] || { color: 'var(--uh-text-muted)', badge: '' };
                                return (
                                    <div key={order._id}
                                        className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <p className="text-white text-sm font-mono font-semibold">{order.orderNumber}</p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--uh-text-muted)' }}>
                                                {order.user?.name} — {order.items?.length} item(s)
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold capitalize mb-1" style={{ color: st.color }}>
                                                {order.status}
                                            </p>
                                            <p className="text-sm font-bold" style={{ color: 'var(--uh-green)' }}>
                                                ₹{order.subtotal?.toFixed(0)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VendorDashboard;
