import { useState, useEffect } from 'react';
import API from '../../api/axios';

interface RiskFlag {
    _id: string;
    userId: { _id: string; name: string; email: string; role: string } | string;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved: boolean;
    metadata: Record<string, any>;
    ipAddress?: string;
    createdAt: string;
}

const SEVERITY_CONFIG = {
    critical: { color: '#D93A3A', bg: 'rgba(217,58,58,0.1)', icon: '🔴', label: 'Critical' },
    high: { color: '#FF6B57', bg: 'rgba(255,107,87,0.08)', icon: '🟠', label: 'High' },
    medium: { color: '#FFCC00', bg: 'rgba(255,204,0,0.08)', icon: '🟡', label: 'Medium' },
    low: { color: '#6E7581', bg: 'rgba(110,117,129,0.08)', icon: '⚪', label: 'Low' },
};

const REASON_LABELS: Record<string, string> = {
    refund_cap_exceeded: '💸 Refund Cap Exceeded',
    multiple_accounts_suspected: '👥 Multi-Account Suspected',
    suspicious_login_pattern: '🔐 Suspicious Login',
    high_cancellation_rate: '❌ High Cancellation Rate',
    chargeback_filed: '💳 Chargeback Filed',
    bot_pattern_detected: '🤖 Bot Pattern',
    velocity_fraud: '⚡ Velocity Fraud',
    manual_flag: '🚩 Manual Flag',
};

const AdminRiskDashboard = () => {
    const [flags, setFlags] = useState<RiskFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState<string | null>(null);
    const [resolveNote, setResolveNote] = useState('');
    const [selectedFlag, setSelectedFlag] = useState<RiskFlag | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const fetchFlags = async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/admin/risk-flags');
            setFlags(data.flags);
        } catch { showToast('❌ Failed to load risk flags'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchFlags(); }, []);

    const handleResolve = async (flagId: string) => {
        if (!resolveNote.trim()) { showToast('⚠️ Please add a resolution note'); return; }
        setResolving(flagId);
        try {
            await API.put(`/admin/risk-flags/${flagId}/resolve`, { note: resolveNote });
            showToast('✅ Flag resolved');
            setSelectedFlag(null);
            setResolveNote('');
            fetchFlags();
        } catch (err: any) {
            showToast('❌ ' + (err.response?.data?.message || 'Failed to resolve'));
        } finally { setResolving(null); }
    };

    const getUser = (flag: RiskFlag) => {
        if (typeof flag.userId === 'object') return flag.userId;
        return null;
    };

    const criticalCount = flags.filter(f => f.severity === 'critical').length;
    const highCount = flags.filter(f => f.severity === 'high').length;

    return (
        <div className="uh-page max-w-7xl mx-auto px-6 py-8">
            {toast && <div className={`uh-toast ${toast.startsWith('✅') ? 'success' : 'error'}`}>{toast}</div>}

            {/* Resolve Modal */}
            {selectedFlag && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <h3 className="text-white font-bold text-lg mb-1">Resolve Risk Flag</h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--uh-text-muted)' }}>
                            {typeof selectedFlag.userId === 'object' ? selectedFlag.userId.email : selectedFlag.userId} · {REASON_LABELS[selectedFlag.reason]}
                        </p>
                        <textarea
                            value={resolveNote}
                            onChange={e => setResolveNote(e.target.value)}
                            placeholder="Resolution note (required) — e.g. 'Verified legitimate user', 'Warning issued', 'Account banned'"
                            className="uh-input w-full text-sm mb-4 resize-none"
                            rows={4}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleResolve(selectedFlag._id)}
                                disabled={resolving === selectedFlag._id}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                                style={{ background: 'linear-gradient(135deg, #0F9D58, #0B8043)', color: 'white' }}
                            >
                                {resolving === selectedFlag._id ? 'Resolving...' : '✅ Mark Resolved'}
                            </button>
                            <button onClick={() => { setSelectedFlag(null); setResolveNote(''); }} className="uh-btn-ghost px-4">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>Risk Dashboard</h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Fraud detection · Abuse prevention · Account safety
                    </p>
                </div>
                <button onClick={fetchFlags} className="uh-btn-ghost text-sm px-4 py-2">🔄 Refresh</button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Unresolved', value: flags.length, color: '#FF6B57' },
                    { label: 'Critical', value: criticalCount, color: '#D93A3A' },
                    { label: 'High', value: highCount, color: '#FF6B57' },
                    { label: 'Resolved Today', value: '—', color: '#0F9D58' },
                ].map(s => (
                    <div key={s.label} className="uh-card p-4 text-center">
                        <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[11px]" style={{ color: 'var(--uh-text-muted)' }}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Flags list */}
            {loading ? (
                <div className="flex items-center justify-center py-16" style={{ color: 'var(--uh-text-muted)' }}>
                    <div className="uh-spinner mr-3" />Loading risk flags...
                </div>
            ) : flags.length === 0 ? (
                <div className="uh-card p-12 text-center">
                    <div className="text-5xl mb-4">🛡️</div>
                    <p className="font-bold text-white">No unresolved risk flags</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--uh-text-muted)' }}>The system is clean. Risk flags appear here automatically.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {flags.map(flag => {
                        const sev = SEVERITY_CONFIG[flag.severity];
                        const user = getUser(flag);
                        return (
                            <div key={flag._id} className="uh-card p-4 rounded-xl" style={{ borderColor: `${sev.color}25` }}>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: sev.bg }}>
                                        {sev.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-sm font-bold text-white">{REASON_LABELS[flag.reason] || flag.reason}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: sev.bg, color: sev.color }}>
                                                {sev.label}
                                            </span>
                                        </div>
                                        <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                            {user ? `${user.name} (${user.email})` : 'Unknown user'}
                                            {flag.ipAddress && ` · IP: ${flag.ipAddress}`}
                                        </p>
                                        {/* Metadata preview */}
                                        {Object.keys(flag.metadata).length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {Object.entries(flag.metadata).slice(0, 4).map(([k, v]) => (
                                                    <span key={k} className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--uh-text-faint)' }}>
                                                        {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>
                                            {new Date(flag.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </p>
                                        <button
                                            onClick={() => setSelectedFlag(flag)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            style={{ background: 'rgba(15,157,88,0.1)', color: '#0F9D58', border: '1px solid rgba(15,157,88,0.25)' }}
                                        >
                                            Resolve
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminRiskDashboard;
