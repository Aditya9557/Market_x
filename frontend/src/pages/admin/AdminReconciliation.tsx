import { useState, useEffect } from 'react';
import API from '../../api/axios';

interface ReconciliationReport {
    _id: string;
    date: string;
    stripeTransactionCount: number;
    internalTransactionCount: number;
    stripeTotalAmount: number;
    internalTotalAmount: number;
    mismatchCount: number;
    status: 'clean' | 'mismatches_found' | 'error';
    mismatches: Array<{
        stripeId: string;
        stripeAmount: number;
        internalAmount?: number;
        type: string;
        description: string;
    }>;
    runAt: string;
    durationMs: number;
}

const STATUS_CONFIG = {
    clean: { color: '#0F9D58', bg: 'rgba(15,157,88,0.08)', icon: '✅', label: 'Clean' },
    mismatches_found: { color: '#FFCC00', bg: 'rgba(255,204,0,0.08)', icon: '⚠️', label: 'Mismatches Found' },
    error: { color: '#D93A3A', bg: 'rgba(217,58,58,0.08)', icon: '❌', label: 'Error' },
};

const AdminReconciliation = () => {
    const [reports, setReports] = useState<ReconciliationReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/admin/reconciliation');
            setReports(data.reports);
        } catch { showToast('❌ Failed to load reconciliation reports'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchReports(); }, []);

    const triggerReconciliation = async () => {
        setTriggering(true);
        try {
            await API.post('/admin/reconciliation/trigger', {});
            showToast('🔄 Reconciliation started — results will appear in ~30 seconds');
            setTimeout(fetchReports, 35000);
        } catch (err: any) {
            showToast('❌ ' + (err.response?.data?.message || 'Failed to trigger'));
        } finally { setTriggering(false); }
    };

    const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    return (
        <div className="uh-page max-w-7xl mx-auto px-6 py-8">
            {toast && <div className={`uh-toast ${toast.startsWith('✅') || toast.startsWith('🔄') ? 'success' : 'error'}`}>{toast}</div>}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>Stripe Reconciliation</h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Daily comparison of Stripe transactions vs internal ledger · Runs at 02:00 UTC
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchReports} className="uh-btn-ghost text-sm px-4 py-2">🔄 Refresh</button>
                    <button
                        onClick={triggerReconciliation}
                        disabled={triggering}
                        className="px-4 py-2 rounded-xl text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg, #4A9EFF, #2563eb)', color: 'white' }}
                    >
                        {triggering ? '⏳ Running...' : '▶ Run Now'}
                    </button>
                </div>
            </div>

            {/* Reports */}
            {loading ? (
                <div className="flex items-center justify-center py-16" style={{ color: 'var(--uh-text-muted)' }}>
                    <div className="uh-spinner mr-3" /> Loading reports...
                </div>
            ) : reports.length === 0 ? (
                <div className="uh-card p-12 text-center">
                    <div className="text-5xl mb-4">📊</div>
                    <p className="font-bold text-white">No reconciliation reports yet</p>
                    <p className="text-sm mt-1 mb-4" style={{ color: 'var(--uh-text-muted)' }}>
                        The cron runs daily at 02:00 UTC, or you can trigger it manually now.
                    </p>
                    <button onClick={triggerReconciliation} disabled={triggering} className="uh-btn px-6 py-2 text-sm">
                        {triggering ? 'Running...' : '▶ Run First Reconciliation'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {reports.map(r => {
                        const cfg = STATUS_CONFIG[r.status];
                        const isExpanded = expandedId === r._id;
                        const diff = r.stripeTotalAmount - r.internalTotalAmount;
                        return (
                            <div
                                key={r._id}
                                className="uh-card rounded-xl overflow-hidden cursor-pointer"
                                onClick={() => setExpandedId(isExpanded ? null : r._id)}
                                style={{ borderColor: `${cfg.color}25` }}
                            >
                                <div className="flex items-center gap-4 p-4">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: cfg.bg }}>
                                        {cfg.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold text-white">
                                                {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: cfg.bg, color: cfg.color }}>
                                                {cfg.label}
                                            </span>
                                            {r.mismatchCount > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(255,204,0,0.1)', color: '#FFCC00' }}>
                                                    {r.mismatchCount} mismatches
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--uh-text-muted)' }}>
                                            Stripe: {r.stripeTransactionCount} txns ({fmt(r.stripeTotalAmount)}) · DB: {r.internalTransactionCount} txns ({fmt(r.internalTotalAmount)})
                                            {Math.abs(diff) > 0.01 && (
                                                <span style={{ color: '#FFCC00' }}> · Gap: {fmt(Math.abs(diff))}</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>
                                            {r.durationMs}ms run
                                        </p>
                                        <span style={{ color: 'var(--uh-text-faint)', fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</span>
                                    </div>
                                </div>

                                {isExpanded && r.mismatches.length > 0 && (
                                    <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p className="text-xs font-bold text-white mt-3 mb-2">Mismatches</p>
                                        <div className="space-y-2">
                                            {r.mismatches.map((m, i) => (
                                                <div key={i} className="p-3 rounded-lg text-xs" style={{ background: 'rgba(255,204,0,0.04)', border: '1px solid rgba(255,204,0,0.12)' }}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold" style={{ color: '#FFCC00' }}>{m.type}</span>
                                                        <code className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>{m.stripeId}</code>
                                                    </div>
                                                    <p style={{ color: 'var(--uh-text-muted)' }}>{m.description}</p>
                                                </div>
                                            ))}
                                        </div>
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

export default AdminReconciliation;
