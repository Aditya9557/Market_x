import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';

const AdminAnalyticsDashboard = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [snapshotLoading, setSnapshotLoading] = useState(false);

    const fetchDashboard = async () => {
        try {
            const { data: res } = await API.get(`/admin/analytics/dashboard?days=${days}`);
            setData(res);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDashboard(); }, [days]);

    const triggerSnapshot = async () => {
        setSnapshotLoading(true);
        try {
            await API.post('/admin/analytics/snapshot');
            await fetchDashboard();
        } catch (err) { console.error(err); }
        finally { setSnapshotLoading(false); }
    };

    const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${n.toLocaleString('en-IN')}`;
    const pct = (n: number) => `${n.toFixed(1)}%`;

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="uh-spinner" />
        </div>
    );

    const latest = data?.latestSnapshot;
    const growth = data?.growth;
    const retention = data?.retention;

    return (
        <div className="uh-page max-w-6xl mx-auto px-6 py-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white" style={{ letterSpacing: '-0.5px' }}>
                        📊 Business Analytics
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Revenue intelligence, growth metrics & operational KPIs
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={days} onChange={e => setDays(Number(e.target.value))}
                        className="uh-input text-sm py-2 px-3 rounded-xl"
                        style={{ background: 'var(--uh-card-bg)', border: '1px solid var(--uh-border)', color: 'white' }}>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={90}>90 days</option>
                    </select>
                    <button onClick={triggerSnapshot} disabled={snapshotLoading}
                        className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                        style={{ background: 'rgba(255,107,87,0.15)', border: '1px solid rgba(255,107,87,0.4)', color: '#FF6B57' }}>
                        {snapshotLoading ? '⏳ Computing...' : '📸 Take Snapshot'}
                    </button>
                </div>
            </div>

            {/* Quick Nav */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                {[
                    { to: '/admin', icon: '🏠', label: 'Dashboard' },
                    { to: '/admin/stores', icon: '🏪', label: 'Stores' },
                    { to: '/admin/orders', icon: '🧾', label: 'Orders' },
                    { to: '/admin/hero-queue', icon: '🦸', label: 'Heroes' },
                    { to: '/admin/risk', icon: '🛡️', label: 'Risk Flags' },
                ].map(a => (
                    <Link key={a.to} to={a.to}
                        className="uh-card p-3 text-center block hover:scale-[1.03] transition-transform">
                        <span className="text-xl block mb-1">{a.icon}</span>
                        <span className="text-xs font-semibold text-white">{a.label}</span>
                    </Link>
                ))}
            </div>

            {/* KPI Cards Row 1 — Revenue */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <KPICard title="GMV (Today)" value={fmt(latest?.gmv || 0)}
                    trend={growth?.week?.growth?.gmv} icon="💰" />
                <KPICard title="Platform Revenue" value={fmt(latest?.platformNetRevenue || 0)}
                    trend={growth?.week?.growth?.revenue} icon="📈" />
                <KPICard title="Avg Order Value" value={fmt(latest?.averageOrderValue || 0)}
                    subtitle="Target: ₹180" icon="🛒" />
                <KPICard title="Total Orders" value={latest?.totalOrders?.toString() || '0'}
                    trend={growth?.week?.growth?.orders} icon="📦" />
            </div>

            {/* KPI Cards Row 2 — Users & Heroes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <KPICard title="Active Students" value={latest?.activeUsers?.toString() || '0'}
                    subtitle={`${latest?.totalUsers || 0} total`} icon="🎓" />
                <KPICard title="Active Heroes" value={latest?.activeHeroes?.toString() || '0'}
                    subtitle={`${pct(latest?.heroUtilizationRate || 0)} utilization`} icon="🦸" />
                <KPICard title="Cancellation Rate" value={pct(latest?.cancellationPct || 0)}
                    subtitle="Target: < 5%" icon="❌"
                    color={latest?.cancellationPct > 5 ? '#D93A3A' : '#0F9D58'} />
                <KPICard title="Repeat Purchase" value={pct(latest?.repeatPurchasePct || 0)}
                    subtitle="30-day window" icon="🔁" />
            </div>

            {/* Revenue Breakdown & Growth Trend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Revenue Breakdown */}
                <div className="uh-card p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        💵 Revenue Breakdown
                    </h3>
                    {data?.revenueBreakdown ? (
                        <div className="space-y-3">
                            <BreakdownBar label="Commissions" value={data.revenueBreakdown.commission}
                                total={data.revenueBreakdown.total} color="#FF6B57" />
                            <BreakdownBar label="Delivery Fees" value={data.revenueBreakdown.delivery}
                                total={data.revenueBreakdown.total} color="#4ECDC4" />
                            <div className="pt-3 border-t" style={{ borderColor: 'var(--uh-border)' }}>
                                <div className="flex justify-between">
                                    <span className="text-sm font-bold text-white">Total Net Revenue</span>
                                    <span className="text-sm font-bold" style={{ color: '#FF6B57' }}>
                                        {fmt(data.revenueBreakdown.total)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>No data yet — trigger a snapshot</p>
                    )}
                </div>

                {/* Growth Trend */}
                <div className="uh-card p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        📊 7-Day Growth Trend
                    </h3>
                    {growth?.week ? (
                        <div className="space-y-4">
                            <GrowthRow label="GMV" current={fmt(growth.week.current.gmv)}
                                growth={growth.week.growth.gmv} />
                            <GrowthRow label="Revenue" current={fmt(growth.week.current.revenue)}
                                growth={growth.week.growth.revenue} />
                            <GrowthRow label="Orders" current={growth.week.current.orders.toString()}
                                growth={growth.week.growth.orders} />
                        </div>
                    ) : (
                        <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>Need 14+ days of snapshots</p>
                    )}
                </div>
            </div>

            {/* Retention & Hero Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Retention */}
                <div className="uh-card p-5">
                    <h3 className="text-white font-bold mb-4">🔄 Student Retention</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <MiniStat label="7-Day Retention" value={pct(retention?.retention7d || 0)} />
                        <MiniStat label="30-Day Retention" value={pct(retention?.retention30d || 0)} />
                        <MiniStat label="Active (7d)" value={retention?.activeStudents7d?.toString() || '0'} />
                        <MiniStat label="Churn Rate" value={pct(retention?.churnRate || 0)}
                            color={retention?.churnRate > 20 ? '#D93A3A' : '#0F9D58'} />
                    </div>
                </div>

                {/* Hero Performance */}
                <div className="uh-card p-5">
                    <h3 className="text-white font-bold mb-4">🦸 Hero Performance</h3>
                    {data?.heroPerformance ? (
                        <div className="grid grid-cols-2 gap-4">
                            <MiniStat label="Total Heroes" value={data.heroPerformance.totalHeroes?.toString()} />
                            <MiniStat label="Active Heroes" value={data.heroPerformance.activeHeroes?.toString()} />
                            <MiniStat label="Utilization" value={pct(data.heroPerformance.utilizationRate || 0)} />
                            <MiniStat label="Avg Earning" value={fmt(data.heroPerformance.avgEarning || 0)} />
                        </div>
                    ) : (
                        <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>No hero data yet</p>
                    )}
                </div>
            </div>

            {/* Peak Hour Heatmap */}
            <div className="uh-card p-5 mb-6">
                <h3 className="text-white font-bold mb-4">🔥 Peak Hour Analysis (7–10 PM)</h3>
                {data?.heatmap?.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                        {data.heatmap.slice(-30).map((h: any, i: number) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold"
                                    style={{
                                        background: h.peakHourPct > 40 ? 'rgba(255,107,87,0.4)'
                                            : h.peakHourPct > 20 ? 'rgba(255,107,87,0.2)'
                                                : 'rgba(255,255,255,0.05)',
                                        color: h.peakHourPct > 20 ? '#FF6B57' : 'var(--uh-text-muted)',
                                    }}>
                                    {h.peakHourOrders || 0}
                                </div>
                                <span className="text-[9px] mt-1" style={{ color: 'var(--uh-text-muted)' }}>
                                    {new Date(h.date).getDate()}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>No heatmap data — snapshots needed</p>
                )}
            </div>

            {/* Financial Estimates */}
            <div className="uh-card p-5">
                <h3 className="text-white font-bold mb-4">💼 Financial Estimates</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MiniStat label="LTV Estimate" value={fmt(latest?.ltvEstimate || 0)} />
                    <MiniStat label="Margin/Order" value={fmt(latest?.contributionMargin || 0)}
                        subtitle="Target: ₹14" />
                    <MiniStat label="Refund Rate" value={pct(latest?.refundPct || 0)} />
                    <MiniStat label="Orders/User" value={(latest?.ordersPerActiveUser || 0).toFixed(1)} />
                </div>
            </div>
        </div>
    );
};

// ─── Sub-components ─────────────────────────────────────────

const KPICard = ({ title, value, trend, icon, subtitle, color }: {
    title: string; value: string; trend?: number; icon: string; subtitle?: string; color?: string;
}) => (
    <div className="uh-card p-4">
        <div className="flex items-center justify-between mb-2">
            <span className="text-lg">{icon}</span>
            {trend !== undefined && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                        background: trend >= 0 ? 'rgba(15,157,88,0.15)' : 'rgba(217,58,58,0.15)',
                        color: trend >= 0 ? '#0F9D58' : '#D93A3A',
                    }}>
                    {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                </span>
            )}
        </div>
        <p className="text-xl font-black text-white" style={color ? { color } : {}}>
            {value}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--uh-text-muted)' }}>
            {subtitle || title}
        </p>
    </div>
);

const BreakdownBar = ({ label, value, total, color }: {
    label: string; value: number; total: number; color: string;
}) => {
    const pctVal = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span style={{ color: 'var(--uh-text-muted)' }}>{label}</span>
                <span className="font-bold" style={{ color }}>
                    ₹{value.toLocaleString('en-IN')} ({pctVal.toFixed(0)}%)
                </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${pctVal}%`, background: color }} />
            </div>
        </div>
    );
};

const GrowthRow = ({ label, current, growth }: { label: string; current: string; growth: number }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>{label}</span>
        <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">{current}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                    background: growth >= 0 ? 'rgba(15,157,88,0.15)' : 'rgba(217,58,58,0.15)',
                    color: growth >= 0 ? '#0F9D58' : '#D93A3A',
                }}>
                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
            </span>
        </div>
    </div>
);

const MiniStat = ({ label, value, subtitle, color }: {
    label: string; value: string; subtitle?: string; color?: string;
}) => (
    <div>
        <p className="text-xs mb-1" style={{ color: 'var(--uh-text-muted)' }}>{label}</p>
        <p className="text-lg font-black" style={{ color: color || 'white' }}>{value}</p>
        {subtitle && <p className="text-[10px]" style={{ color: 'var(--uh-text-muted)' }}>{subtitle}</p>}
    </div>
);

export default AdminAnalyticsDashboard;
