import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import BecomeHeroModal from '../../components/BecomeHeroModal';
import HeroApplicationStatus from '../../components/HeroApplicationStatus';
import HeroProfileCard from '../../components/HeroProfileCard';

const HeroDashboard = () => {
    const [heroStatus, setHeroStatus] = useState<any>(null);
    const [earnings, setEarnings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [heroModalOpen, setHeroModalOpen] = useState(false);
    const [applicationRefresh, setApplicationRefresh] = useState(0);

    const fetchData = async () => {
        try {
            const { data: status } = await API.get('/hero/status');
            setHeroStatus(status);
            if (status.isHero) {
                const { data: earn } = await API.get('/hero/earnings');
                setEarnings(earn);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);



    useEffect(() => { fetchData(); }, []);

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="uh-spinner" />
        </div>
    );

    /* ─── Onboarding & Status ─── */
    if (!heroStatus?.isHero) {
        return (
            <div className="uh-page max-w-4xl mx-auto px-6 py-8">
                {/* Become a Hero Modal */}
                <BecomeHeroModal
                    isOpen={heroModalOpen}
                    onClose={() => setHeroModalOpen(false)}
                    onApplicationSubmitted={() => {
                        setApplicationRefresh(r => r + 1);
                        fetchData();
                    }}
                />

                {/* Hero Profile Card (usually hidden if not hero, but handled internally) */}
                <HeroProfileCard />

                {/* Hero Application Status Card */}
                <HeroApplicationStatus key={applicationRefresh} />

                {/* Become a Hero CTA Card */}
                <div
                    className="p-5 rounded-2xl flex items-center justify-between gap-4 group cursor-pointer transition-all hover:scale-[1.01]"
                    onClick={() => setHeroModalOpen(true)}
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,107,87,0.08) 0%, rgba(255,59,92,0.05) 100%)',
                        border: '1px solid rgba(255,107,87,0.15)',
                        boxShadow: '0 4px 24px rgba(255,107,87,0.06)',
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform"
                            style={{ background: 'linear-gradient(135deg, #FF6B57, #FF3B5C)', boxShadow: '0 4px 16px rgba(255,107,87,0.3)' }}
                        >
                            🦸
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Become a Hero</h3>
                            <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                Earn by helping classmates — flexible hours
                            </p>
                        </div>
                    </div>
                    <span
                        className="px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all group-hover:shadow-lg"
                        style={{
                            background: 'rgba(255,107,87,0.12)',
                            border: '1px solid rgba(255,107,87,0.3)',
                            color: '#FF6B57',
                        }}
                    >
                        Apply →
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="uh-page max-w-4xl mx-auto px-6 py-8">
            {/* If they are a hero, show the nicely designed Profile Card at the top */}
            <HeroProfileCard />
            <div className="mb-6" />

            <div className="mb-4">
                <h1 className="text-3xl font-black text-white" style={{ letterSpacing: '-0.5px' }}>Hero Dashboard</h1>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Today's Earnings", value: `₹${earnings?.todayEarnings?.toFixed(0) || '0'}`, icon: '💰', accent: 'var(--uh-green)' },
                    { label: "Today's Deliveries", value: earnings?.todayDeliveries || 0, icon: '📦', accent: 'var(--uh-coral)' },
                    { label: 'Total Earnings', value: `₹${earnings?.totalEarnings?.toFixed(0) || '0'}`, icon: '🏦', accent: '#a78bfa' },
                    { label: 'Rating', value: `${heroStatus.rating?.toFixed(1) || '5.0'} ⭐`, icon: '', accent: 'var(--uh-yellow)' },
                ].map((stat, i) => (
                    <div key={i} className="uh-card p-5">
                        <p className="text-2xl mb-2">{stat.icon}</p>
                        <p className="text-2xl font-black" style={{ color: stat.accent }}>{stat.value}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--uh-text-muted)' }}>{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                    { to: '/hero/orders', icon: '📋', label: 'Available Orders', desc: 'Find orders to deliver', accent: 'var(--uh-coral)' },
                    { to: '/hero/active', icon: '🏃', label: 'Active Delivery', desc: 'Manage current delivery', accent: 'var(--uh-green)' },
                    { to: '/hero/earnings', icon: '💸', label: 'Earnings', desc: 'View detailed breakdown', accent: '#a78bfa' },
                ].map(a => (
                    <Link key={a.to} to={a.to}
                        className="uh-card p-5 block group hover:scale-[1.02] transition-transform">
                        <p className="text-3xl mb-3 group-hover:scale-110 transition-transform inline-block">{a.icon}</p>
                        <h3 className="font-bold text-white mb-1">{a.label}</h3>
                        <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>{a.desc}</p>
                        <span className="text-xs font-semibold mt-3 inline-block" style={{ color: a.accent }}>Open →</span>
                    </Link>
                ))}
            </div>

            {/* Recent Deliveries */}
            {earnings?.recentDeliveries?.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">Recent Deliveries</h2>
                        <Link to="/hero/earnings" className="text-sm font-semibold" style={{ color: 'var(--uh-coral)' }}>View All →</Link>
                    </div>
                    <div className="uh-card overflow-hidden">
                        {earnings.recentDeliveries.slice(0, 5).map((d: any, i: number) => (
                            <div key={d._id}
                                className="flex items-center justify-between px-5 py-4"
                                style={{ borderBottom: i < 4 ? '1px solid var(--uh-card-border)' : 'none' }}>
                                <div>
                                    <p className="text-white font-semibold text-sm">Order #{d.orderNumber}</p>
                                    <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>{d.store}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm" style={{ color: 'var(--uh-green)' }}>+₹{d.total?.toFixed(0)}</p>
                                    <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                        {d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString() : '—'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeroDashboard;
