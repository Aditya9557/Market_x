import { useState, useEffect } from 'react';
import API from '../../api/axios';

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: '⏳ Pending', color: '#FFCC00', bg: 'rgba(255,204,0,0.1)', border: 'rgba(255,204,0,0.3)' },
    approved: { label: '✅ Approved', color: '#0F9D58', bg: 'rgba(15,157,88,0.1)', border: 'rgba(15,157,88,0.3)' },
    rejected: { label: '✕ Rejected', color: '#D93A3A', bg: 'rgba(217,58,58,0.1)', border: 'rgba(217,58,58,0.25)' },
};

const catEmoji: Record<string, string> = {
    food: '🍔', books: '📚', stationery: '✏️',
    electronics: '💻', clothing: '👕', services: '⚙️', other: '📦'
};

const AdminStores = () => {
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchStores = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filter !== 'all') params.status = filter;
            const { data } = await API.get('/admin/all-stores', { params });
            setStores(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStores(); }, [filter]);

    const toggleUniGuide = async (storeId: string) => {
        try {
            const { data } = await API.put(`/admin/uniguide-toggle/${storeId}`);
            setStores(prev => prev.map(s =>
                s._id === storeId ? { ...s, approvedForUniGuide: data.approvedForUniGuide } : s
            ));
        } catch (err) { console.error(err); }
    };

    const handleStatus = async (userId: string, status: 'approve' | 'reject') => {
        try {
            await API.put(`/admin/${status}-shop/${userId}`);
            fetchStores();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="uh-page max-w-6xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>All Stores</h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        {loading ? 'Loading…' : `${stores.length} store${stores.length !== 1 ? 's' : ''}`}
                    </p>
                </div>
                <button onClick={fetchStores} className="uh-btn-ghost px-4 py-2 text-sm">🔄 Refresh</button>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 flex-wrap mb-6">
                {['all', 'pending', 'approved', 'rejected'].map(s => {
                    const cfg = statusConfig[s];
                    return (
                        <button key={s} onClick={() => setFilter(s)}
                            className={`uh-chip capitalize ${filter === s ? 'active' : ''}`}>
                            {s === 'all' ? '🔢 All' : cfg?.label || s}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="uh-spinner" /></div>
            ) : stores.length === 0 ? (
                <div className="uh-card text-center py-20">
                    <p className="text-5xl mb-4">🏪</p>
                    <p className="text-xl font-bold text-white mb-1">No stores found</p>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>Try a different status filter</p>
                </div>
            ) : (
                <div className="uh-card overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-3 px-5 py-3"
                        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--uh-card-border)' }}>
                        {[
                            { label: 'Store', col: 'col-span-3' },
                            { label: 'Owner', col: 'col-span-2' },
                            { label: 'Type & Category', col: 'col-span-2' },
                            { label: 'Commission', col: 'col-span-1' },
                            { label: 'Status', col: 'col-span-2' },
                            { label: 'Actions', col: 'col-span-2' },
                        ].map(({ label, col }) => (
                            <div key={label} className={`uh-label ${col}`}>{label}</div>
                        ))}
                    </div>

                    {stores.map((store: any, idx: number) => {
                        const st = statusConfig[store.status] || statusConfig.pending;
                        return (
                            <div key={store._id} className="grid grid-cols-12 gap-3 items-center px-5 py-4"
                                style={{ borderBottom: idx < stores.length - 1 ? '1px solid var(--uh-card-border)' : 'none' }}>

                                <div className="col-span-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{catEmoji[store.category] || '📦'}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{store.name}</p>
                                            <p className="text-xs truncate" style={{ color: 'var(--uh-text-faint)' }}>
                                                {store.description || 'No description'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <p className="text-sm text-white font-medium truncate">{store.owner?.name || 'Unknown'}</p>
                                    <p className="text-xs truncate" style={{ color: 'var(--uh-text-faint)' }}>{store.owner?.email}</p>
                                </div>

                                <div className="col-span-2">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs capitalize font-bold" style={{ color: store.storeType === 'virtual' ? 'var(--uh-coral)' : 'var(--uh-text)' }}>
                                            {store.storeType === 'virtual' ? '🎨 Virtual' : '🏪 Physical'}
                                        </span>
                                        <span className="text-xs capitalize flex items-center gap-1" style={{ color: 'var(--uh-text-muted)' }}>
                                            <span>{catEmoji[store.category] || '📦'}</span>
                                            {store.category}
                                        </span>
                                    </div>
                                </div>

                                <div className="col-span-1">
                                    <span className="text-sm font-bold text-white">{store.commissionRate || 10}%</span>
                                </div>

                                <div className="col-span-2">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                                        style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                                        {st.label}
                                    </span>
                                </div>

                                <div className="col-span-2 flex items-center gap-2">
                                    {store.status === 'pending' ? (
                                        <>
                                            <button onClick={() => handleStatus(store.owner?._id, 'approve')}
                                                className="uh-btn-primary px-3 py-1.5 text-xs">
                                                Approve
                                            </button>
                                            <button onClick={() => handleStatus(store.owner?._id, 'reject')}
                                                className="uh-btn-outline border-red-500/30 text-red-500 px-3 py-1.5 text-xs hover:bg-red-500/10">
                                                Reject
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => toggleUniGuide(store._id)}
                                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all"
                                            style={store.approvedForUniGuide
                                                ? { background: 'rgba(15,157,88,0.1)', color: '#0F9D58', border: '1px solid rgba(15,157,88,0.3)' }
                                                : { background: 'rgba(255,255,255,0.04)', color: 'var(--uh-text-muted)', border: '1px solid var(--uh-card-border)' }
                                            }>
                                            {store.approvedForUniGuide ? '🎓 Uni Guide On' : '○ Uni Guide Off'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminStores;
