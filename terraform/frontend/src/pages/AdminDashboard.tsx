import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';

interface PendingShop {
    _id: string;
    name: string;
    email: string;
    shopName: string;
    status: string;
    store?: { _id: string; name: string; category: string; description: string; };
    createdAt: string;
}

const AdminDashboard = () => {
    const [pendingShops, setPendingShops] = useState<PendingShop[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchPending = async () => {
        try {
            const { data } = await API.get('/admin/pending-shops');
            setPendingShops(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPending(); }, []);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setActionLoading(id + action);
        try {
            await API.put(`/admin/${action}-shop/${id}`);
            await fetchPending();
        } catch (err) { console.error(err); }
        finally { setActionLoading(null); }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="uh-spinner" />
        </div>
    );

    return (
        <div className="uh-page max-w-5xl mx-auto px-6 py-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-black text-white" style={{ letterSpacing: '-0.5px' }}>
                            Admin Dashboard
                        </h1>
                        {pendingShops.length > 0 && (
                            <span className="uh-badge-coral text-xs animate-pulse">
                                {pendingShops.length} pending
                            </span>
                        )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Approve shops, manage Uni Guide, and oversee the campus marketplace
                    </p>
                </div>
            </div>

            {/* Quick Nav */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                    { to: '/admin/stores', icon: '🏪', label: 'All Stores' },
                    { to: '/admin/orders', icon: '🧾', label: 'All Orders' },
                    { to: '/admin/hero-queue', icon: '🦸', label: 'Hero Queue' },
                    { to: '/campus-guide', icon: '🗺️', label: 'Uni Guide' },
                ].map(a => (
                    <Link key={a.to} to={a.to}
                        className="uh-card p-4 text-center block hover:scale-[1.03] transition-transform">
                        <span className="text-2xl block mb-1">{a.icon}</span>
                        <span className="text-sm font-semibold text-white">{a.label}</span>
                    </Link>
                ))}
            </div>

            {/* Pending Approvals */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    Pending Shop Approvals
                    <span className="uh-badge-yellow">{pendingShops.length}</span>
                </h2>

                {pendingShops.length === 0 ? (
                    <div className="uh-card text-center py-16">
                        <p className="text-5xl mb-4">✅</p>
                        <p className="text-xl font-bold text-white mb-2">All caught up!</p>
                        <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>No pending shop approvals right now.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingShops.map(shop => (
                            <div key={shop._id} className="uh-card p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        {/* Store icon + name */}
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                                style={{ background: 'rgba(255,107,87,0.12)', border: '1px solid rgba(255,107,87,0.25)' }}>
                                                🏪
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold">
                                                    {shop.shopName || shop.store?.name || 'Unnamed Store'}
                                                </h3>
                                                <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                                    {shop.name} · {shop.email}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Meta */}
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            {shop.store?.category && (
                                                <span className="uh-badge-coral capitalize">{shop.store.category}</span>
                                            )}
                                            <span className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                                Applied {new Date(shop.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>

                                        {shop.store?.description && (
                                            <p className="text-sm line-clamp-2" style={{ color: 'var(--uh-text-muted)' }}>
                                                {shop.store.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button
                                            onClick={() => handleAction(shop._id, 'approve')}
                                            disabled={!!actionLoading}
                                            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                                            style={{
                                                background: actionLoading === shop._id + 'approve' ? 'rgba(15,157,88,0.3)' : 'rgba(15,157,88,0.15)',
                                                border: '1px solid rgba(15,157,88,0.4)',
                                                color: '#0F9D58',
                                            }}>
                                            {actionLoading === shop._id + 'approve' ? '...' : '✓ Approve'}
                                        </button>
                                        <button
                                            onClick={() => handleAction(shop._id, 'reject')}
                                            disabled={!!actionLoading}
                                            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                                            style={{
                                                background: 'rgba(217,58,58,0.08)',
                                                border: '1px solid rgba(217,58,58,0.25)',
                                                color: '#D93A3A',
                                            }}>
                                            {actionLoading === shop._id + 'reject' ? '...' : '✕ Reject'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
