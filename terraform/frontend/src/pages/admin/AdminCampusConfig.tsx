import { useState, useEffect } from 'react';
import API from '../../api/axios';

interface CampusConfig {
    _id?: string;
    campusId: string;
    name: string;
    isActive: boolean;
    baseFee: number;
    perKmRate: number;
    maxDeliveryRadius: number;
    platformCommission: number;
    heroCommission: number;
    maxRefundPerWeek: number;
    minOrderValue: number;
    features: {
        heroDelivery: boolean;
        campusGuide: boolean;
        uniGuide: boolean;
        walletTopup: boolean;
        guestCheckout: boolean;
        disputeCenter: boolean;
    };
    minReliabilityScore: number;
    autosuspendThreshold: number;
}

const defaultConfig: CampusConfig = {
    campusId: '',
    name: '',
    isActive: true,
    baseFee: 15,
    perKmRate: 5,
    maxDeliveryRadius: 5,
    platformCommission: 10,
    heroCommission: 70,
    maxRefundPerWeek: 500,
    minOrderValue: 50,
    features: {
        heroDelivery: true,
        campusGuide: true,
        uniGuide: true,
        walletTopup: true,
        guestCheckout: false,
        disputeCenter: true,
    },
    minReliabilityScore: 2.0,
    autosuspendThreshold: 30,
};

const AdminCampusConfig = () => {
    const [configs, setConfigs] = useState<CampusConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<CampusConfig | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/admin/campus-configs');
            setConfigs(data.configs);
        } catch { showToast('❌ Failed to load campus configs'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchConfigs(); }, []);

    const saveConfig = async () => {
        if (!editing) return;
        if (!editing.campusId.trim()) { showToast('⚠️ Campus ID is required'); return; }
        setSaving(true);
        try {
            await API.put(`/admin/campus-configs/${editing.campusId}`, editing);
            showToast('✅ Campus config saved');
            setEditing(null);
            setIsNew(false);
            fetchConfigs();
        } catch (err: any) {
            showToast('❌ ' + (err.response?.data?.message || 'Save failed'));
        } finally { setSaving(false); }
    };

    const featureLabels: Record<string, string> = {
        heroDelivery: '🦸 Hero Delivery', campusGuide: '🗺️ Campus Guide',
        uniGuide: '🏫 UniGuide', walletTopup: '💰 Wallet Top-up',
        guestCheckout: '👤 Guest Checkout', disputeCenter: '⚖️ Dispute Center',
    };

    return (
        <div className="uh-page max-w-7xl mx-auto px-6 py-8">
            {toast && <div className={`uh-toast ${toast.startsWith('✅') ? 'success' : 'error'}`}>{toast}</div>}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>Campus Config</h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Per-campus delivery pricing, commissions, refund limits, and feature flags
                    </p>
                </div>
                <button
                    onClick={() => { setEditing({ ...defaultConfig }); setIsNew(true); }}
                    className="uh-btn text-sm px-4 py-2"
                >+ Add Campus</button>
            </div>

            {/* Edit panel */}
            {editing && (
                <div className="uh-card p-6 rounded-2xl mb-6">
                    <h2 className="text-white font-bold text-lg mb-4">{isNew ? 'New Campus' : `Edit: ${editing.name}`}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Basic info */}
                        <div>
                            <label className="uh-label">Campus ID *</label>
                            <input className="uh-input w-full" value={editing.campusId} disabled={!isNew}
                                onChange={e => setEditing(c => c && ({ ...c, campusId: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                placeholder="campus_main" />
                        </div>
                        <div>
                            <label className="uh-label">Campus Name *</label>
                            <input className="uh-input w-full" value={editing.name}
                                onChange={e => setEditing(c => c && ({ ...c, name: e.target.value }))}
                                placeholder="Main Campus" />
                        </div>

                        {/* Pricing */}
                        <div>
                            <label className="uh-label">Base Delivery Fee (₹)</label>
                            <input type="number" className="uh-input w-full" value={editing.baseFee}
                                onChange={e => setEditing(c => c && ({ ...c, baseFee: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="uh-label">Per-km Rate (₹)</label>
                            <input type="number" className="uh-input w-full" value={editing.perKmRate}
                                onChange={e => setEditing(c => c && ({ ...c, perKmRate: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="uh-label">Max Delivery Radius (km)</label>
                            <input type="number" className="uh-input w-full" value={editing.maxDeliveryRadius}
                                onChange={e => setEditing(c => c && ({ ...c, maxDeliveryRadius: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="uh-label">Min Order Value (₹)</label>
                            <input type="number" className="uh-input w-full" value={editing.minOrderValue}
                                onChange={e => setEditing(c => c && ({ ...c, minOrderValue: Number(e.target.value) }))} />
                        </div>

                        {/* Financials */}
                        <div>
                            <label className="uh-label">Platform Commission (%)</label>
                            <input type="number" className="uh-input w-full" value={editing.platformCommission} min={0} max={100}
                                onChange={e => setEditing(c => c && ({ ...c, platformCommission: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="uh-label">Hero Commission (%)</label>
                            <input type="number" className="uh-input w-full" value={editing.heroCommission} min={0} max={100}
                                onChange={e => setEditing(c => c && ({ ...c, heroCommission: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="uh-label">Max Refund/Week (₹)</label>
                            <input type="number" className="uh-input w-full" value={editing.maxRefundPerWeek}
                                onChange={e => setEditing(c => c && ({ ...c, maxRefundPerWeek: Number(e.target.value) }))} />
                        </div>

                        {/* Hero discipline */}
                        <div>
                            <label className="uh-label">Min Reliability Score</label>
                            <input type="number" step="0.1" className="uh-input w-full" value={editing.minReliabilityScore} min={0} max={5}
                                onChange={e => setEditing(c => c && ({ ...c, minReliabilityScore: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="uh-label">Auto-suspend Cancellation % </label>
                            <input type="number" className="uh-input w-full" value={editing.autosuspendThreshold} min={0} max={100}
                                onChange={e => setEditing(c => c && ({ ...c, autosuspendThreshold: Number(e.target.value) }))} />
                        </div>
                    </div>

                    {/* Feature flags */}
                    <div className="mt-5">
                        <p className="text-sm font-bold text-white mb-3">Feature Flags</p>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(editing.features).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => setEditing(c => c && ({ ...c, features: { ...c.features, [key]: !val } }))}
                                    className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                                    style={{
                                        background: val ? 'rgba(15,157,88,0.12)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${val ? 'rgba(15,157,88,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                        color: val ? '#0F9D58' : 'var(--uh-text-muted)',
                                    }}
                                >
                                    {featureLabels[key] || key} {val ? 'ON' : 'OFF'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-5">
                        <button onClick={saveConfig} disabled={saving} className="uh-btn px-6 py-2 text-sm">
                            {saving ? '⏳ Saving...' : '💾 Save Config'}
                        </button>
                        <button onClick={() => { setEditing(null); setIsNew(false); }} className="uh-btn-ghost px-4">Cancel</button>
                    </div>
                </div>
            )}

            {/* Config list */}
            {loading ? (
                <div className="flex items-center justify-center py-12" style={{ color: 'var(--uh-text-muted)' }}>
                    <div className="uh-spinner mr-3" />Loading...
                </div>
            ) : configs.length === 0 ? (
                <div className="uh-card p-10 text-center">
                    <div className="text-5xl mb-4">🏫</div>
                    <p className="font-bold text-white">No campus configs yet</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--uh-text-muted)' }}>Create a config for your first campus to get started.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {configs.map(c => (
                        <div key={c.campusId} className="uh-card p-5 rounded-xl">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-white font-bold">{c.name}</h3>
                                    <code className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--uh-text-faint)' }}>
                                        {c.campusId}
                                    </code>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                        style={{ background: c.isActive ? 'rgba(15,157,88,0.1)' : 'rgba(110,117,129,0.1)', color: c.isActive ? '#0F9D58' : '#6E7581' }}>
                                        {c.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <button onClick={() => { setEditing({ ...c }); setIsNew(false); }} className="uh-btn-ghost text-xs px-2 py-1">Edit</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                {[
                                    { label: 'Base Fee', value: `₹${c.baseFee}` },
                                    { label: 'Platform %', value: `${c.platformCommission}%` },
                                    { label: 'Refund Cap', value: `₹${c.maxRefundPerWeek}/wk` },
                                ].map(s => (
                                    <div key={s.label} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <p className="text-sm font-bold text-white">{s.value}</p>
                                        <p className="text-[9px]" style={{ color: 'var(--uh-text-faint)' }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminCampusConfig;
