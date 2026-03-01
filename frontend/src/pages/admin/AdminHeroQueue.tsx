import { useState, useEffect } from 'react';
import API from '../../api/axios';

interface HeroApp {
    _id: string;
    fullName: string;
    campusEmail: string;
    phone: string;
    zone: string;
    preferredHours: string[];
    vehicleType: string;
    studentIdUrl?: string;
    selfieUrl?: string;
    bankDetails?: string;
    status: string;
    rejectionReason?: string;
    adminNotes?: string;
    createdAt: string;
    reviewedAt?: string;
    user?: { _id: string; name: string; email: string; role: string };
    reviewedBy?: { name: string; email: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
    submitted: { label: '📤 Submitted', color: '#FFCC00', bg: 'rgba(255,204,0,0.1)', border: 'rgba(255,204,0,0.3)', icon: '📤' },
    under_review: { label: '🔍 Under Review', color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)', border: 'rgba(74,158,255,0.3)', icon: '🔍' },
    approved: { label: '✅ Approved', color: '#0F9D58', bg: 'rgba(15,157,88,0.1)', border: 'rgba(15,157,88,0.3)', icon: '✅' },
    rejected: { label: '❌ Rejected', color: '#D93A3A', bg: 'rgba(217,58,58,0.1)', border: 'rgba(217,58,58,0.25)', icon: '❌' },
};

const VEHICLE_EMOJI: Record<string, string> = {
    walk: '🚶', bicycle: '🚲', scooter: '🛵', car: '🚗',
};

const AdminHeroQueue = () => {
    const [applications, setApplications] = useState<HeroApp[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('submitted');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedApp, setSelectedApp] = useState<HeroApp | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/admin/hero-applications', { params: { status: filter } });
            setApplications(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchApplications(); }, [filter]);

    const handleApprove = async (id: string) => {
        setActionLoading(id + 'approve');
        try {
            await API.put(`/admin/hero-applications/${id}/approve`, { adminNotes });
            showToast('✅ Application approved! Hero can now start delivering.');
            setSelectedApp(null);
            setAdminNotes('');
            fetchApplications();
        } catch (err: any) {
            showToast('❌ ' + (err.response?.data?.message || 'Failed to approve'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!rejectReason.trim()) {
            showToast('⚠️ Please provide a rejection reason');
            return;
        }
        setActionLoading(id + 'reject');
        try {
            await API.put(`/admin/hero-applications/${id}/reject`, { reason: rejectReason, adminNotes });
            showToast('Application rejected. User has been notified.');
            setSelectedApp(null);
            setRejectReason('');
            setAdminNotes('');
            fetchApplications();
        } catch (err: any) {
            showToast('❌ ' + (err.response?.data?.message || 'Failed to reject'));
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="uh-page max-w-6xl mx-auto px-6 py-8">
            {/* Toast */}
            {toast && <div className={`uh-toast ${toast.startsWith('✅') ? 'success' : toast.startsWith('❌') ? 'error' : 'info'}`}>{toast}</div>}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-black text-white" style={{ letterSpacing: '-0.5px' }}>
                            Hero Applications
                        </h1>
                        {applications.length > 0 && filter === 'submitted' && (
                            <span className="uh-badge-coral text-xs animate-pulse">
                                {applications.length} pending
                            </span>
                        )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Review and manage hero delivery applications
                    </p>
                </div>
                <button onClick={fetchApplications} className="uh-btn-ghost px-4 py-2 text-sm">🔄 Refresh</button>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 flex-wrap mb-6">
                {['submitted', 'under_review', 'approved', 'rejected', 'all'].map(s => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`uh-chip capitalize ${filter === s ? 'active' : ''}`}
                        >
                            {s === 'all' ? '🔢 All' : cfg?.label || s.replace('_', ' ')}
                        </button>
                    );
                })}
            </div>

            {/* Applications List */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="uh-spinner" /></div>
            ) : applications.length === 0 ? (
                <div className="uh-card text-center py-20">
                    <p className="text-5xl mb-4">🦸</p>
                    <p className="text-xl font-bold text-white mb-2">No applications</p>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        No hero applications match the selected filter.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {applications.map(app => {
                        const st = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted;
                        return (
                            <div key={app._id} className="uh-card p-5 group">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Applicant info */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div
                                                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                                                style={{ background: 'linear-gradient(135deg, #FF6B57, #FF3B5C)' }}
                                            >
                                                {app.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-white font-bold text-sm truncate">{app.fullName}</h3>
                                                <p className="text-xs truncate" style={{ color: 'var(--uh-text-muted)' }}>
                                                    {app.campusEmail} · {app.phone}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Details row */}
                                        <div className="flex items-center gap-3 flex-wrap mb-3">
                                            <span
                                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}
                                            >
                                                {st.label}
                                            </span>
                                            <span className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                                📍 {app.zone}
                                            </span>
                                            <span className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                                {VEHICLE_EMOJI[app.vehicleType] || '🚶'} {app.vehicleType}
                                            </span>
                                            <span className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                                ⏰ {app.preferredHours.join(', ')}
                                            </span>
                                            <span className="text-xs" style={{ color: 'var(--uh-text-faint)' }}>
                                                Applied {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>

                                        {/* Preview images inline */}
                                        <div className="flex gap-3">
                                            {app.studentIdUrl && (
                                                <div className="w-20 h-14 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <img src={app.studentIdUrl} alt="Student ID" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            {app.selfieUrl && (
                                                <div className="w-14 h-14 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <img src={app.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            {!app.studentIdUrl && !app.selfieUrl && (
                                                <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>No documents uploaded</p>
                                            )}
                                        </div>

                                        {/* Rejected reason */}
                                        {app.status === 'rejected' && app.rejectionReason && (
                                            <div className="mt-2 p-2 rounded-lg" style={{ background: 'rgba(217,58,58,0.06)', border: '1px solid rgba(217,58,58,0.1)' }}>
                                                <p className="text-[10px]" style={{ color: '#D93A3A' }}>
                                                    <strong>Reason:</strong> {app.rejectionReason}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {(app.status === 'submitted' || app.status === 'under_review') && (
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <button
                                                onClick={() => { setSelectedApp(app); }}
                                                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                                style={{ background: 'rgba(255,107,87,0.12)', border: '1px solid rgba(255,107,87,0.3)', color: '#FF6B57' }}
                                            >
                                                👁️ Review
                                            </button>
                                            <button
                                                onClick={() => handleApprove(app._id)}
                                                disabled={!!actionLoading}
                                                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                                style={{ background: 'rgba(15,157,88,0.12)', border: '1px solid rgba(15,157,88,0.3)', color: '#0F9D58' }}
                                            >
                                                {actionLoading === app._id + 'approve' ? '...' : '✓ Quick Approve'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Review Detail Modal */}
            {selectedApp && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={() => { setSelectedApp(null); setRejectReason(''); setAdminNotes(''); }}
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                >
                    <div
                        className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-6"
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(180deg, #1a1a2e 0%, #12121e 60%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-4 mb-5">
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0"
                                style={{ background: 'linear-gradient(135deg, #FF6B57, #FF3B5C)' }}
                            >
                                {selectedApp.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">{selectedApp.fullName}</h2>
                                <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                    {selectedApp.campusEmail} · 📱 {selectedApp.phone}
                                </p>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                            {[
                                { label: 'Zone', value: selectedApp.zone, icon: '📍' },
                                { label: 'Vehicle', value: `${VEHICLE_EMOJI[selectedApp.vehicleType]} ${selectedApp.vehicleType}`, icon: '' },
                                { label: 'Preferred Hours', value: selectedApp.preferredHours.join(', '), icon: '⏰' },
                                { label: 'Bank/UPI', value: selectedApp.bankDetails || 'Not provided', icon: '💳' },
                            ].map(d => (
                                <div key={d.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p className="uh-label text-[10px] mb-1">{d.icon} {d.label}</p>
                                    <p className="text-sm font-semibold text-white capitalize">{d.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Documents */}
                        <div className="mb-5">
                            <p className="uh-label mb-2">📎 Uploaded Documents</p>
                            <div className="grid grid-cols-2 gap-3">
                                {selectedApp.studentIdUrl ? (
                                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <img src={selectedApp.studentIdUrl} alt="Student ID" className="w-full h-32 object-cover" />
                                        <p className="text-[10px] font-bold text-center py-1" style={{ color: 'var(--uh-text-muted)', background: 'rgba(255,255,255,0.03)' }}>🪪 Student ID</p>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                                        <p className="text-2xl mb-1">🪪</p>
                                        <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>No ID uploaded</p>
                                    </div>
                                )}
                                {selectedApp.selfieUrl ? (
                                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <img src={selectedApp.selfieUrl} alt="Selfie" className="w-full h-32 object-cover" />
                                        <p className="text-[10px] font-bold text-center py-1" style={{ color: 'var(--uh-text-muted)', background: 'rgba(255,255,255,0.03)' }}>🤳 Selfie</p>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                                        <p className="text-2xl mb-1">🤳</p>
                                        <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>No selfie uploaded</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] mt-2" style={{ color: 'var(--uh-text-faint)' }}>
                                🔒 ID photos are secure; only admins can view them for verification.
                            </p>
                        </div>

                        {/* Admin Notes */}
                        <div className="mb-4">
                            <label className="uh-label block mb-1.5">Admin Notes (internal)</label>
                            <textarea
                                value={adminNotes}
                                onChange={e => setAdminNotes(e.target.value)}
                                className="uh-input"
                                rows={2}
                                placeholder="Optional internal notes..."
                                style={{ resize: 'none' }}
                            />
                        </div>

                        {/* Reject Reason */}
                        <div className="mb-5">
                            <label className="uh-label block mb-1.5">Rejection Reason (if rejecting)</label>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                className="uh-input"
                                rows={2}
                                placeholder="Reason shown to applicant..."
                                style={{ resize: 'none' }}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleApprove(selectedApp._id)}
                                disabled={!!actionLoading}
                                className="py-3 rounded-xl text-sm font-bold transition-all"
                                style={{
                                    background: actionLoading === selectedApp._id + 'approve' ? 'rgba(15,157,88,0.3)' : 'linear-gradient(135deg, rgba(15,157,88,0.2), rgba(15,157,88,0.1))',
                                    border: '1px solid rgba(15,157,88,0.4)',
                                    color: '#0F9D58',
                                }}
                            >
                                {actionLoading === selectedApp._id + 'approve' ? 'Approving...' : '✓ Approve Hero'}
                            </button>
                            <button
                                onClick={() => handleReject(selectedApp._id)}
                                disabled={!!actionLoading}
                                className="py-3 rounded-xl text-sm font-bold transition-all"
                                style={{
                                    background: 'rgba(217,58,58,0.08)',
                                    border: '1px solid rgba(217,58,58,0.25)',
                                    color: '#D93A3A',
                                }}
                            >
                                {actionLoading === selectedApp._id + 'reject' ? 'Rejecting...' : '✕ Reject'}
                            </button>
                        </div>

                        <button
                            onClick={() => { setSelectedApp(null); setRejectReason(''); setAdminNotes(''); }}
                            className="uh-btn-ghost w-full mt-3 text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHeroQueue;
