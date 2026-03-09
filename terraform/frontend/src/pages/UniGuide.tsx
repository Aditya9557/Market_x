import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

/* ─── Types ─── */
interface UniGuideShop {
    _id: string; name: string; category: string; zone: string;
    description?: string; status: string; approvedForUniGuide: boolean; openForUniGuide: boolean;
    settings: { openingHours?: string; address?: string; deliveryRadius?: number };
    owner?: { _id: string; name: string };
    images: string[];
    storeType?: string;
}
interface ZoneInfo { zone: string; label: string; totalShops: number; openShops: number; }
interface HeroTask {
    _id: string; orderNumber: string; status: string; total: number;
    deliveryAddress: string; createdAt: string;
    customer: { _id: string; name: string };
    store: { _id: string; name: string; zone: string; settings: any; category: string } | null;
    itemCount: number;
}

/* ─── Constants ─── */
const ZONE_CONFIG: Record<string, { emoji: string; label: string }> = {
    all: { emoji: '🌐', label: 'All Zones' },
    north_gate: { emoji: '🚪', label: 'North Gate' },
    south_gate: { emoji: '🚪', label: 'South Gate' },
    hostel_area: { emoji: '🏠', label: 'Hostel Area' },
    academic_block: { emoji: '📚', label: 'Academic Block' },
    main_market: { emoji: '🏪', label: 'Main Market' },
    food_court: { emoji: '🍽️', label: 'Food Court' },
    admin_block: { emoji: '🏛️', label: 'Admin Block' },
    other: { emoji: '📍', label: 'Other' },
};

const CATEGORY_CONFIG: Record<string, { emoji: string; label: string }> = {
    all: { emoji: '🌐', label: 'All' },
    food: { emoji: '🍔', label: 'Food' },
    books: { emoji: '📚', label: 'Books' },
    stationery: { emoji: '✏️', label: 'Stationery' },
    electronics: { emoji: '💻', label: 'Electronics' },
    clothing: { emoji: '👕', label: 'Clothing' },
    services: { emoji: '⚙️', label: 'Services' },
    other: { emoji: '📦', label: 'Other' },
};

const CATEGORY_KEYS = ['all', 'food', 'books', 'stationery', 'electronics', 'clothing', 'services', 'other'];

const timeAgo = (dateStr: string) => {
    const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
};

/* ════════════════════════════════════════════════════════════════ */
const UniGuide = () => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const isHero = (user as any)?.isHeroMode || user?.role === 'hero';
    const isVendor = user?.role === 'shopkeeper';

    const [shops, setShops] = useState<UniGuideShop[]>([]);
    const [zones, setZones] = useState<ZoneInfo[]>([]);
    const [heroTasks, setHeroTasks] = useState<HeroTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeZone, setActiveZone] = useState('all');
    const [activeCategory, setActiveCategory] = useState('all');
    const [openOnly, setOpenOnly] = useState(false);
    const [search, setSearch] = useState('');
    const [activeStoreType, setActiveStoreType] = useState('all');
    const [accepting, setAccepting] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

    const toast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 3000);
    };

    useEffect(() => {
        API.get('/uniguide/zones').then(({ data }) => setZones(data)).catch(console.error);
        if (isHero && isAuthenticated) {
            API.get('/uniguide/hero-tasks').then(({ data }) => setHeroTasks(data)).catch(console.error);
        }
    }, [isHero, isAuthenticated]);

    useEffect(() => {
        const fetchShops = async () => {
            setLoading(true);
            try {
                const params: any = {};
                if (activeZone !== 'all') params.zone = activeZone;
                if (activeCategory !== 'all') params.category = activeCategory;
                if (openOnly) params.openOnly = 'true';
                if (search.trim()) params.search = search.trim();
                if (activeStoreType !== 'all') params.storeType = activeStoreType;
                const { data } = await API.get('/uniguide/shops', { params });
                setShops(data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        const timer = setTimeout(fetchShops, search ? 300 : 0);
        return () => clearTimeout(timer);
    }, [activeZone, activeCategory, openOnly, search, activeStoreType]);

    const handleAcceptTask = async (orderId: string) => {
        setAccepting(orderId);
        try {
            await API.post(`/hero/accept/${orderId}`);
            setHeroTasks(prev => prev.filter(t => t._id !== orderId));
            toast('Delivery accepted! Head to the store for pickup 🏃', 'success');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Could not accept';
            toast(msg.includes('already') ? 'Already taken — try another! 🤷' : msg, 'error');
        } finally { setAccepting(null); }
    };

    /* ════════════════════════ RENDER ════════════════════════ */
    return (
        <div className="uh-page max-w-7xl mx-auto px-4 sm:px-6 py-6">

            {/* Toast */}
            {toastMsg && (
                <div className={`uh-toast ${toastMsg.type}`}>
                    {toastMsg.text}
                </div>
            )}

            {/* ─── Header ─── */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>
                        🎓 Uni Guide
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Find campus shops &amp; request deliveries
                    </p>
                </div>
                {isAuthenticated && (
                    <button
                        onClick={() => navigate(user?.role === 'shopkeeper' ? '/vendor/dashboard' : '/browse')}
                        className="uh-btn-ghost px-4 py-2 text-sm">
                        ← Back
                    </button>
                )}
            </div>

            {/* ─── Hero Task Queue ─── */}
            {isHero && isAuthenticated && heroTasks.length > 0 && (
                <div className="mb-8 rounded-2xl p-5"
                    style={{ background: 'rgba(15,157,88,0.07)', border: '1px solid rgba(15,157,88,0.25)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--uh-green)' }}>
                            🦸 Pending Delivery Tasks
                        </h2>
                        <span className="uh-badge-green">{heroTasks.length} available</span>
                    </div>

                    <div className="space-y-3">
                        {heroTasks.map(task => (
                            <div key={task._id} className="uh-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-white font-bold font-mono">#{task.orderNumber}</span>
                                        <span className="uh-badge-yellow capitalize">{task.status}</span>
                                        <span className="text-xs" style={{ color: 'var(--uh-text-faint)' }}>
                                            {timeAgo(task.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm truncate mb-1" style={{ color: 'var(--uh-text-muted)' }}>
                                        {task.store
                                            ? `${ZONE_CONFIG[task.store.zone]?.emoji || '📍'} ${task.store.name}`
                                            : 'Campus Store'}
                                        {' → '}{task.deliveryAddress}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--uh-text-faint)' }}>
                                        <span>📦 {task.itemCount} item{task.itemCount !== 1 ? 's' : ''}</span>
                                        <span style={{ color: 'var(--uh-green)', fontWeight: 700 }}>₹{task.total.toFixed(0)}</span>
                                        <span>👤 {task.customer?.name}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAcceptTask(task._id)}
                                    disabled={accepting === task._id}
                                    className="uh-btn-primary px-5 py-2.5 text-sm shrink-0">
                                    {accepting === task._id
                                        ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Accepting...</span>
                                        : '✅ Accept Delivery'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-center mt-3" style={{ color: 'var(--uh-text-faint)' }}>
                        💡 Your location is shared only for accepted deliveries. Turn off any time.
                    </p>
                </div>
            )}

            {/* ─── Search ─── */}
            <div className="mb-5 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--uh-text-faint)' }}>🔍</span>
                <input
                    type="text"
                    placeholder="Search campus shops..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="uh-input pl-11"
                    style={{ fontSize: '15px', padding: '14px 44px' }}
                />
                {search && (
                    <button onClick={() => setSearch('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold"
                        style={{ color: 'var(--uh-text-muted)' }}>✕</button>
                )}
            </div>

            {/* ─── Zone Filter ─── */}
            <div className="mb-3">
                <p className="uh-label mb-2">Zone</p>
                <div className="flex gap-2 flex-wrap">
                    {['all', ...zones.map(z => z.zone)].map(zone => {
                        const cfg = ZONE_CONFIG[zone] || { emoji: '📍', label: zone };
                        const zInfo = zones.find(z => z.zone === zone);
                        return (
                            <button key={zone} onClick={() => setActiveZone(zone)}
                                className={`uh-chip ${activeZone === zone ? 'active' : ''}`}>
                                {cfg.emoji} {cfg.label}
                                {zInfo && (
                                    <span className="ml-1 text-xs opacity-60">
                                        {zInfo.openShops}/{zInfo.totalShops}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mb-4">
                <p className="uh-label mb-2">Category</p>
                <div className="flex gap-2 flex-wrap">
                    {CATEGORY_KEYS.map(cat => {
                        const cfg = CATEGORY_CONFIG[cat];
                        return (
                            <button key={cat} onClick={() => setActiveCategory(cat)}
                                className={`uh-chip ${activeCategory === cat ? 'active' : ''}`}>
                                {cfg.emoji} {cfg.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── Store Type Filter ─── */}
            <div className="mb-4">
                <p className="uh-label mb-2">Shop Type</p>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setActiveStoreType('all')} className={`uh-chip ${activeStoreType === 'all' ? 'active' : ''}`}>
                        🌐 All Shops
                    </button>
                    <button onClick={() => setActiveStoreType('physical')} className={`uh-chip ${activeStoreType === 'physical' ? 'active' : ''}`}>
                        🏪 Campus Shops
                    </button>
                    <button onClick={() => setActiveStoreType('virtual')} className={`uh-chip ${activeStoreType === 'virtual' ? 'active' : ''}`}>
                        🎨 Virtual Shops
                    </button>
                </div>
            </div>

            {/* ─── Open Only Toggle + Count ─── */}
            <div className="flex items-center justify-between mb-6">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    {/* Custom toggle */}
                    <div onClick={() => setOpenOnly(!openOnly)}
                        className="relative w-12 h-6 rounded-full transition-all duration-300"
                        style={{
                            background: openOnly ? 'var(--uh-green)' : 'rgba(255,255,255,0.1)',
                            boxShadow: openOnly ? '0 0 12px rgba(15,157,88,0.4)' : 'none'
                        }}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${openOnly ? 'left-6' : 'left-0.5'}`} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>Show only open shops</span>
                </label>

                <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        {loading ? 'Loading...' : `${shops.length} shop${shops.length !== 1 ? 's' : ''}`}
                    </span>
                    {(activeZone !== 'all' || activeCategory !== 'all' || openOnly || search || activeStoreType !== 'all') && (
                        <button
                            onClick={() => { setActiveZone('all'); setActiveCategory('all'); setOpenOnly(false); setSearch(''); setActiveStoreType('all'); }}
                            className="text-xs font-semibold px-2 py-1 rounded-lg transition-all"
                            style={{ color: 'var(--uh-coral)', background: 'rgba(255,107,87,0.08)', border: '1px solid rgba(255,107,87,0.2)' }}>
                            ✕ Reset
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Vendor Banner ─── */}
            {isVendor && isAuthenticated && (
                <div className="mb-6 rounded-xl p-4 flex items-center justify-between"
                    style={{ background: 'rgba(255,107,87,0.06)', border: '1px solid rgba(255,107,87,0.2)' }}>
                    <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--uh-coral)' }}>
                            🏪 Your shop's Uni Guide status
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--uh-text-muted)' }}>
                            Manage visibility in Store Settings → Uni Guide section
                        </p>
                    </div>
                    <Link to="/vendor/settings" className="uh-btn-outline px-4 py-2 text-xs">
                        ⚙️ Settings
                    </Link>
                </div>
            )}

            {/* ─── Shop Grid ─── */}
            {loading ? (
                <div className="flex justify-center py-24">
                    <div className="uh-spinner" />
                </div>
            ) : shops.length === 0 ? (
                <div className="uh-card text-center py-20">
                    <p className="text-6xl mb-4">🗺️</p>
                    <p className="text-xl font-bold text-white mb-2">No campus shops found</p>
                    <p className="text-sm mb-6" style={{ color: 'var(--uh-text-muted)' }}>
                        Try a different zone, category, or toggle "open only" off
                    </p>
                    <button
                        onClick={() => { setActiveZone('all'); setActiveCategory('all'); setOpenOnly(false); setSearch(''); setActiveStoreType('all'); }}
                        className="uh-btn-outline px-6 py-2.5">
                        Reset all filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {shops.map(shop => {
                        const zoneCfg = ZONE_CONFIG[shop.zone] || { emoji: '📍', label: shop.zone };
                        const catCfg = CATEGORY_CONFIG[shop.category] || { emoji: '📦', label: shop.category };
                        const isOpen = shop.openForUniGuide;
                        return (
                            <div key={shop._id}
                                className="uh-card overflow-hidden flex flex-col group"
                                style={{ borderColor: isOpen ? 'rgba(15,157,88,0.2)' : undefined }}>

                                {/* Card Header strip */}
                                <div className="px-4 py-2.5 flex items-center justify-between"
                                    style={{
                                        background: isOpen
                                            ? 'linear-gradient(90deg, rgba(15,157,88,0.15) 0%, rgba(15,157,88,0.06) 100%)'
                                            : 'rgba(255,255,255,0.03)',
                                        borderBottom: '1px solid var(--uh-card-border)'
                                    }}>
                                    <span className="text-xs font-bold" style={{ color: isOpen ? 'var(--uh-green)' : 'var(--uh-text-muted)' }}>
                                        {zoneCfg.emoji} {zoneCfg.label}
                                    </span>
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                                        style={{
                                            background: isOpen ? 'rgba(15,157,88,0.15)' : 'rgba(217,58,58,0.1)',
                                            color: isOpen ? '#0F9D58' : '#D93A3A',
                                            border: `1px solid ${isOpen ? 'rgba(15,157,88,0.3)' : 'rgba(217,58,58,0.2)'}`,
                                        }}>
                                        {isOpen ? '● Open' : '○ Closed'}
                                    </span>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="text-base font-bold text-white group-hover:text-[#FF6B57] transition-colors truncate">
                                            {shop.storeType === 'virtual' ? '🎨' : '🏪'} {shop.name}
                                        </h3>
                                        <span className="text-xs px-2 py-0.5 rounded-full capitalize shrink-0"
                                            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--uh-text-muted)', border: '1px solid var(--uh-card-border)' }}>
                                            {catCfg.emoji} {catCfg.label}
                                        </span>
                                    </div>

                                    {shop.description && (
                                        <p className="text-sm line-clamp-2 mb-3 flex-1" style={{ color: 'var(--uh-text-muted)' }}>
                                            {shop.description}
                                        </p>
                                    )}

                                    {/* Meta details */}
                                    <div className="space-y-1 text-xs mb-4" style={{ color: 'var(--uh-text-faint)' }}>
                                        {shop.settings?.openingHours && <p>🕐 {shop.settings.openingHours}</p>}
                                        {shop.settings?.address && <p>📍 {shop.settings.address}</p>}
                                        {shop.owner && <p>👤 {shop.owner.name}</p>}
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-auto flex gap-2">
                                        <Link to="/browse"
                                            className="flex-1 py-2.5 text-center rounded-xl text-sm font-bold transition-all"
                                            style={{
                                                background: 'rgba(255,107,87,0.1)',
                                                color: '#FF6B57',
                                                border: '1px solid rgba(255,107,87,0.25)'
                                            }}>
                                            🛍️ Open Shop
                                        </Link>
                                        {isOpen && isAuthenticated && user?.role === 'student' && (
                                            <button
                                                onClick={() => toast('Place an order first, then request a hero from your order page! 🦸', 'info')}
                                                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                                                style={{
                                                    background: 'rgba(15,157,88,0.1)',
                                                    color: '#0F9D58',
                                                    border: '1px solid rgba(15,157,88,0.25)'
                                                }}>
                                                🦸 Request Delivery
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Footer ─── */}
            <div className="mt-12 text-center text-xs space-y-1" style={{ color: 'var(--uh-text-faint)' }}>
                <p>📍 Campus shops are shown only if admin-approved and currently open for Uni Guide</p>
                <p>🔒 Your location is shared only for active delivery requests. Turn off any time in your profile.</p>
            </div>
        </div>
    );
};

export default UniGuide;
