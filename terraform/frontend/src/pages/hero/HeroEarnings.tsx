import { useState, useEffect } from 'react';
import API from '../../api/axios';

const HeroEarnings = () => {
    const [earnings, setEarnings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try { const { data } = await API.get('/hero/earnings'); setEarnings(data); }
            catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    if (loading) return <div className="flex justify-center items-center py-32"><div className="uh-spinner" /></div>;

    if (!earnings) return (
        <div className="uh-card text-center py-20 max-w-md mx-auto mt-16">
            <p className="text-5xl mb-4">💸</p>
            <p className="text-xl font-bold text-white">Could not load earnings</p>
        </div>
    );

    const avg = earnings.totalDeliveries > 0
        ? (earnings.totalEarnings / earnings.totalDeliveries).toFixed(0)
        : '0';

    const statCards = [
        { label: "Today's Earnings", value: `₹${earnings.todayEarnings?.toFixed(0)}`, sub: `${earnings.todayDeliveries} deliveries`, color: 'var(--uh-green)', icon: '💚' },
        { label: 'All Time', value: `₹${earnings.totalEarnings?.toFixed(0)}`, sub: `${earnings.totalDeliveries} deliveries`, color: 'var(--uh-coral)', icon: '🏆' },
        { label: 'Avg per Delivery', value: `₹${avg}`, sub: 'per order', color: '#FFCC00', icon: '⚡' },
        { label: 'Rating', value: `${earnings.rating?.toFixed(1) || '—'}★`, sub: 'from customers', color: '#a78bfa', icon: '⭐' },
    ];

    return (
        <div className="uh-page max-w-4xl mx-auto px-6 py-8">
            <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>
                Earnings 💰
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--uh-text-muted)' }}>Your delivery income overview</p>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {statCards.map(card => (
                    <div key={card.label} className="uh-card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{card.icon}</span>
                            <p className="text-xs font-semibold" style={{ color: 'var(--uh-text-muted)' }}>{card.label}</p>
                        </div>
                        <p className="text-2xl font-black mb-1" style={{ color: card.color }}>{card.value}</p>
                        <p className="text-xs" style={{ color: 'var(--uh-text-faint)' }}>{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* Instant Payout Banner */}
            <div className="uh-card p-5 mb-8 flex items-center justify-between gap-4"
                style={{ borderColor: 'rgba(15,157,88,0.3)', background: 'rgba(15,157,88,0.06)' }}>
                <div>
                    <h3 className="text-base font-bold text-white mb-1">⚡ Instant Payout</h3>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Cash out your earnings to your debit card instantly
                    </p>
                </div>
                <button className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-not-allowed shrink-0"
                    style={{ background: 'rgba(15,157,88,0.1)', color: 'var(--uh-green)', border: '1px solid rgba(15,157,88,0.25)', opacity: 0.6 }}>
                    Coming Soon
                </button>
            </div>

            {/* Delivery History */}
            <h2 className="text-lg font-bold text-white mb-4">Delivery History</h2>
            {earnings.recentDeliveries?.length > 0 ? (
                <div className="uh-card overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-6 gap-2 px-5 py-3"
                        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--uh-card-border)' }}>
                        {['Order', 'Store', 'Fee', 'Tip', 'Total', 'Date'].map(h => (
                            <div key={h} className="uh-label">{h}</div>
                        ))}
                    </div>

                    {earnings.recentDeliveries.map((d: any, idx: number) => (
                        <div key={d._id} className="grid grid-cols-6 gap-2 items-center px-5 py-3.5"
                            style={{ borderBottom: idx < earnings.recentDeliveries.length - 1 ? '1px solid var(--uh-card-border)' : 'none' }}>
                            <div className="text-sm text-white font-mono">#{d.orderNumber || '—'}</div>
                            <div className="text-sm truncate" style={{ color: 'var(--uh-text-muted)' }}>{d.store || '—'}</div>
                            <div className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>₹{d.fee?.toFixed(0)}</div>
                            <div className="text-sm font-bold" style={{ color: d.tip > 0 ? '#FFCC00' : 'var(--uh-text-faint)' }}>
                                {d.tip > 0 ? `₹${d.tip.toFixed(0)}` : '·'}
                            </div>
                            <div className="text-sm font-black" style={{ color: 'var(--uh-green)' }}>₹{d.total?.toFixed(0)}</div>
                            <div className="text-xs" style={{ color: 'var(--uh-text-faint)' }}>
                                {d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="uh-card text-center py-14">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-white font-bold mb-1">No deliveries yet</p>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>Accept your first order to start earning!</p>
                </div>
            )}
        </div>
    );
};

export default HeroEarnings;
