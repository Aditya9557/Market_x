import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';

const storeCategories = ['food', 'books', 'stationery', 'electronics', 'clothing', 'services', 'other'];
const zoneOptions = [
    { value: 'north_gate', label: '🚪 North Gate' },
    { value: 'south_gate', label: '🚪 South Gate' },
    { value: 'hostel_area', label: '🏠 Hostel Area' },
    { value: 'academic_block', label: '📚 Academic Block' },
    { value: 'main_market', label: '🏪 Main Market' },
    { value: 'food_court', label: '🍽️ Food Court' },
    { value: 'admin_block', label: '🏛️ Admin Block' },
    { value: 'other', label: '📍 Other' },
];

const StoreSettings = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const [form, setForm] = useState({
        name: '', description: '', category: 'other',
        deliveryRadius: '', address: '', openingHours: '',
        zone: 'other', openForUniGuide: false
    });

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const { data } = await API.get('/vendor/store');
                setStore(data);
                setForm({
                    name: data.name || '',
                    description: data.description || '',
                    category: data.category || 'other',
                    deliveryRadius: data.settings?.deliveryRadius?.toString() || '',
                    address: data.settings?.address || '',
                    openingHours: data.settings?.openingHours || '',
                    zone: data.zone || 'other',
                    openForUniGuide: data.openForUniGuide || false
                });
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchStore();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        try {
            await API.put('/vendor/store', {
                name: form.name, description: form.description, category: form.category,
                zone: form.zone, openForUniGuide: form.openForUniGuide,
                settings: {
                    deliveryRadius: form.deliveryRadius ? parseFloat(form.deliveryRadius) : undefined,
                    address: form.address, openingHours: form.openingHours
                }
            });
            setToast('✅ Settings saved successfully!');
            setTimeout(() => setToast(''), 3000);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to save settings');
        } finally { setSaving(false); }
    };

    if (loading) return <div className="flex justify-center items-center py-32"><div className="uh-spinner" /></div>;

    const statusColor = store?.status === 'approved' ? 'var(--uh-green)' : store?.status === 'rejected' ? 'var(--uh-error)' : '#FFCC00';
    const statusBg = store?.status === 'approved' ? 'rgba(15,157,88,0.1)' : store?.status === 'rejected' ? 'rgba(217,58,58,0.1)' : 'rgba(255,204,0,0.1)';

    return (
        <div className="uh-page max-w-3xl mx-auto px-6 py-8">

            {/* Toast */}
            {toast && <div className="uh-toast success">{toast}</div>}

            {/* Pending store alert with Sign Out */}
            {store?.status !== 'approved' && (
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
            <div className="mb-6">
                <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>Store Settings</h1>
                <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>Update your store information and visibility</p>
            </div>

            {/* Store Status Card */}
            <div className="uh-card p-5 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ background: statusBg, border: `1px solid ${statusColor}40` }}>
                            {store?.status === 'approved' ? '✅' : store?.status === 'rejected' ? '❌' : '⏳'}
                        </div>
                        <div>
                            <p className="uh-label mb-1">Store Status</p>
                            <p className="text-lg font-bold capitalize" style={{ color: statusColor }}>
                                {store?.status || 'Pending'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="uh-label mb-1">Commission Rate</p>
                        <p className="text-xl font-black text-white">{store?.commissionRate || 10}%</p>
                    </div>
                    <div className="text-right">
                        <p className="uh-label mb-1">Owner</p>
                        <p className="text-white font-semibold">{user?.name}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
                {/* Basic Info */}
                <div className="uh-card p-6">
                    <h3 className="text-base font-bold text-white mb-4">🏪 Basic Information</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="uh-label mb-2">Store Name *</p>
                            <input type="text" value={form.name} required
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. Campus Bites" className="uh-input" />
                        </div>
                        <div>
                            <p className="uh-label mb-2">Description</p>
                            <textarea value={form.description} rows={3} style={{ resize: 'none' }}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Tell students about your store..." className="uh-input" />
                        </div>
                        <div>
                            <p className="uh-label mb-2">Category *</p>
                            <select value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                className="uh-input appearance-none cursor-pointer">
                                {storeCategories.map(cat => (
                                    <option key={cat} value={cat} style={{ background: '#12121e' }} className="capitalize">{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Location & Delivery */}
                <div className="uh-card p-6">
                    <h3 className="text-base font-bold text-white mb-4">📍 Location &amp; Delivery</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="uh-label mb-2">Address</p>
                            <input type="text" value={form.address}
                                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                placeholder="e.g. Building B, Ground Floor, Main Campus" className="uh-input" />
                        </div>
                        <div>
                            <p className="uh-label mb-2">Delivery Radius (km)</p>
                            <input type="number" step="0.5" min="0" value={form.deliveryRadius}
                                onChange={e => setForm(f => ({ ...f, deliveryRadius: e.target.value }))}
                                placeholder="e.g. 5" className="uh-input" />
                        </div>
                        <div>
                            <p className="uh-label mb-2">Opening Hours</p>
                            <input type="text" value={form.openingHours}
                                onChange={e => setForm(f => ({ ...f, openingHours: e.target.value }))}
                                placeholder="e.g. Mon–Fri 9AM–6PM" className="uh-input" />
                        </div>
                    </div>
                </div>

                {/* Uni Guide Section */}
                <div className="uh-card p-6">
                    <h3 className="text-base font-bold text-white mb-4">🎓 Uni Guide Visibility</h3>

                    {!store?.approvedForUniGuide ? (
                        <div className="rounded-xl p-4 text-center"
                            style={{ background: 'rgba(255,204,0,0.06)', border: '1px solid rgba(255,204,0,0.2)' }}>
                            <p className="text-sm font-bold" style={{ color: '#FFCC00' }}>⏳ Awaiting Admin Approval</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--uh-text-muted)' }}>
                                Your shop will appear in Uni Guide once an admin approves it.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <p className="uh-label mb-2">Campus Zone</p>
                                <select value={form.zone || 'other'}
                                    onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                                    className="uh-input appearance-none cursor-pointer">
                                    {zoneOptions.map(z => (
                                        <option key={z.value} value={z.value} style={{ background: '#12121e' }}>{z.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Open for UniGuide Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--uh-card-border)' }}>
                                <div>
                                    <p className="text-sm font-bold text-white">Open for Uni Guide</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--uh-text-muted)' }}>
                                        Show your shop to campus students &amp; heroes
                                    </p>
                                </div>
                                <div onClick={() => setForm(f => ({ ...f, openForUniGuide: !f.openForUniGuide }))}
                                    className="relative w-13 h-7 rounded-full cursor-pointer transition-all duration-300"
                                    style={{
                                        width: '52px', height: '28px',
                                        background: form.openForUniGuide ? 'var(--uh-green)' : 'rgba(255,255,255,0.1)',
                                        boxShadow: form.openForUniGuide ? '0 0 14px rgba(15,157,88,0.4)' : 'none'
                                    }}>
                                    <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-300 ${form.openForUniGuide ? 'left-6' : 'left-0.5'}`} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button type="submit" disabled={saving} className="uh-btn-primary w-full py-4 text-base">
                    {saving
                        ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</span>
                        : '💾 Save Settings'}
                </button>
            </form>
        </div>
    );
};

export default StoreSettings;
