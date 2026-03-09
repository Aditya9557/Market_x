import { useState, useEffect } from 'react';
import API from '../../api/axios';

interface AuditLog {
    _id: string;
    adminId: string;
    adminEmail: string;
    actionType: string;
    targetType: string;
    targetId: string;
    targetLabel?: string;
    metadata: Record<string, any>;
    ipAddress: string;
    createdAt: string;
}

const ACTION_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    hero_approved: { color: '#0F9D58', bg: 'rgba(15,157,88,0.08)', icon: '✅', label: 'Hero Approved' },
    hero_rejected: { color: '#D93A3A', bg: 'rgba(217,58,58,0.08)', icon: '❌', label: 'Hero Rejected' },
    shop_approved: { color: '#0F9D58', bg: 'rgba(15,157,88,0.08)', icon: '🏪', label: 'Shop Approved' },
    shop_rejected: { color: '#D93A3A', bg: 'rgba(217,58,58,0.08)', icon: '🚫', label: 'Shop Rejected' },
    dispute_resolved: { color: '#4A9EFF', bg: 'rgba(74,158,255,0.08)', icon: '⚖️', label: 'Dispute Resolved' },
    refund_issued: { color: '#FFCC00', bg: 'rgba(255,204,0,0.08)', icon: '💸', label: 'Refund Issued' },
    user_banned: { color: '#D93A3A', bg: 'rgba(217,58,58,0.1)', icon: '🔨', label: 'User Banned' },
    user_suspended: { color: '#FF6B57', bg: 'rgba(255,107,87,0.08)', icon: '⏸️', label: 'Suspended' },
    user_unsuspended: { color: '#0F9D58', bg: 'rgba(15,157,88,0.06)', icon: '▶️', label: 'Unsuspended' },
    commission_changed: { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', icon: '📊', label: 'Commission Changed' },
    campus_config_changed: { color: '#4A9EFF', bg: 'rgba(74,158,255,0.08)', icon: '⚙️', label: 'Config Changed' },
    risk_flag_cleared: { color: '#0F9D58', bg: 'rgba(15,157,88,0.06)', icon: '🛡️', label: 'Flag Cleared' },
};

const AdminAuditLog = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: any = { limit: 50 };
            if (filter !== 'all') params.actionType = filter;
            const { data } = await API.get('/admin/audit-logs', { params });
            setLogs(data.logs);
        } catch (err: any) {
            showToast('❌ Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [filter]);

    const filterGroups = [
        { key: 'all', label: '📋 All', color: 'rgba(255,255,255,0.1)' },
        { key: 'hero_approved', label: '✅ Heroes', color: 'rgba(15,157,88,0.15)' },
        { key: 'shop_approved', label: '🏪 Shops', color: 'rgba(74,158,255,0.15)' },
        { key: 'dispute_resolved', label: '⚖️ Disputes', color: 'rgba(167,139,250,0.15)' },
        { key: 'refund_issued', label: '💸 Refunds', color: 'rgba(255,204,0,0.15)' },
        { key: 'user_banned', label: '🔨 Users', color: 'rgba(217,58,58,0.15)' },
    ];

    return (
        <div className="uh-page max-w-7xl mx-auto px-6 py-8">
            {toast && <div className={`uh-toast ${toast.startsWith('✅') ? 'success' : 'error'}`}>{toast}</div>}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>
                        Admin Audit Log
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Immutable record of every sensitive admin action
                    </p>
                </div>
                <button onClick={fetchLogs} className="uh-btn-ghost text-sm px-4 py-2">
                    🔄 Refresh
                </button>
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 mb-6">
                {filterGroups.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                            background: filter === f.key ? f.color : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${filter === f.key ? f.color.replace('0.15', '0.4') : 'rgba(255,255,255,0.08)'}`,
                            color: filter === f.key ? 'white' : 'var(--uh-text-muted)',
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20" style={{ color: 'var(--uh-text-muted)' }}>
                    <div className="uh-spinner mr-3" />Loading audit log...
                </div>
            ) : logs.length === 0 ? (
                <div className="uh-card p-12 text-center">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="font-bold text-white">No audit logs found</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--uh-text-muted)' }}>
                        Admin actions will appear here once recorded.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {logs.map(log => {
                        const cfg = ACTION_CONFIG[log.actionType] || { color: '#6E7581', bg: 'rgba(110,117,129,0.08)', icon: '📝', label: log.actionType };
                        const isExpanded = expandedId === log._id;
                        return (
                            <div
                                key={log._id}
                                className="uh-card rounded-xl overflow-hidden cursor-pointer transition-all"
                                onClick={() => setExpandedId(isExpanded ? null : log._id)}
                                style={{ borderColor: isExpanded ? `${cfg.color}40` : undefined }}
                            >
                                <div className="flex items-center gap-4 p-4">
                                    {/* Icon */}
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                                        style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
                                    >
                                        {cfg.icon}
                                    </div>

                                    {/* Action info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold text-white">{cfg.label}</span>
                                            {log.targetLabel && (
                                                <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--uh-text-muted)' }}>
                                                    {log.targetLabel}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--uh-text-faint)' }}>
                                            {log.adminEmail} · {log.ipAddress}
                                        </p>
                                    </div>

                                    {/* Time */}
                                    <div className="text-right shrink-0">
                                        <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                            {new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </p>
                                        <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>
                                            {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>

                                    <span style={{ color: 'var(--uh-text-faint)', fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</span>
                                </div>

                                {/* Expanded metadata */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="mt-3 p-3 rounded-xl font-mono text-[10px] overflow-auto max-h-48" style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--uh-text-muted)' }}>
                                            <span style={{ color: cfg.color }}>// metadata</span>{'\n'}
                                            {JSON.stringify(log.metadata, null, 2)}
                                        </div>
                                        <div className="flex gap-4 mt-2">
                                            <span className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>
                                                Target: {log.targetType} / {log.targetId}
                                            </span>
                                            <span className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>
                                                Admin ID: {log.adminId}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="text-center text-[10px] mt-6" style={{ color: 'var(--uh-text-faint)' }}>
                Showing latest {logs.length} records · Audit logs are immutable and cannot be deleted
            </p>
        </div>
    );
};

export default AdminAuditLog;
