import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const Profile = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [updatingLocation, setUpdatingLocation] = useState(false);

    useEffect(() => {
        setLocationEnabled(!!user?.locationServicesEnabled);
    }, [user]);

    const handleLogout = () => { logout(); navigate('/login'); };

    const handleLocationToggle = async () => {
        setUpdatingLocation(true);
        try {
            if (!locationEnabled) {
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        async ({ coords: { latitude, longitude } }) => {
                            await API.put('/user/location', { latitude, longitude, enabled: true });
                            setLocationEnabled(true);
                        },
                        async () => {
                            alert('Could not access location. Please check browser permissions.');
                            await API.put('/user/location', { enabled: false });
                            setLocationEnabled(false);
                        }
                    );
                } else {
                    alert('Geolocation is not supported by your browser.');
                    setUpdatingLocation(false);
                }
            } else {
                await API.put('/user/location', { enabled: false });
                setLocationEnabled(false);
            }
        } catch (error) { console.error(error); }
        finally { setUpdatingLocation(false); }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            try { await API.delete('/user/delete'); logout(); navigate('/'); }
            catch { alert('Failed to delete account. You may have active orders.'); }
        }
    };

    const roleColor = user?.role === 'hero' ? 'var(--uh-coral)' : user?.role === 'shopkeeper' ? 'var(--uh-green)' : '#60a5fa';
    const roleEmoji = user?.role === 'hero' ? '🦸' : user?.role === 'shopkeeper' ? '🏪' : '🎓';

    const actions = [
        { emoji: '💰', label: 'My Wallet', sub: 'View rewards & history', path: '/wallet', color: 'var(--uh-coral)' },
        { emoji: '💬', label: 'Contact Us', sub: 'Get in touch with support', path: '/contact', color: '#60a5fa' },
        { emoji: '📄', label: 'Terms & Conditions', sub: 'Review our terms of service', path: '/terms', color: '#a78bfa' },
        { emoji: '🛡️', label: 'Privacy & Refund', sub: 'Privacy & Refund Policy', path: '/privacy', color: 'var(--uh-green)' },
    ];

    return (
        <div className="uh-page max-w-lg mx-auto px-5 py-6">

            {/* User Hero Card */}
            <div className="uh-card p-6 mb-6 text-center relative overflow-hidden">
                {/* subtle bg gradient */}
                <div className="absolute inset-0 opacity-5"
                    style={{ background: 'radial-gradient(circle at 50% 0%, var(--uh-coral) 0%, transparent 70%)' }} />

                <div className="relative">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-3"
                        style={{ background: 'linear-gradient(135deg, var(--uh-coral) 0%, #ff8c7a 100%)', boxShadow: '0 0 32px rgba(255,107,87,0.3)' }}>
                        {user?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <h2 className="text-xl font-black text-white mb-1">{user?.name || 'Student'}</h2>
                    <p className="text-sm mb-3" style={{ color: 'var(--uh-text-muted)' }}>{user?.email}</p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize"
                        style={{ background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}40` }}>
                        {roleEmoji} {user?.role || 'Student'}
                    </span>
                </div>
            </div>

            {/* Location Services */}
            <div className="uh-card p-4 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ background: 'rgba(15,157,88,0.12)', border: '1px solid rgba(15,157,88,0.25)' }}>
                        📍
                    </div>
                    <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--uh-green)' }}>Location Services</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--uh-text-muted)' }}>
                            For smooth deliveries &amp; nearby shops
                        </p>
                    </div>
                </div>
                <button onClick={handleLocationToggle} disabled={updatingLocation}
                    className="relative w-12 h-6 rounded-full transition-all duration-300"
                    style={{
                        background: locationEnabled ? 'var(--uh-green)' : 'rgba(255,255,255,0.1)',
                        boxShadow: locationEnabled ? '0 0 12px rgba(15,157,88,0.4)' : 'none',
                        opacity: updatingLocation ? 0.5 : 1
                    }}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${locationEnabled ? 'left-6' : 'left-0.5'}`} />
                </button>
            </div>

            {/* Quick Actions */}
            <div className="mb-5">
                <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--uh-text-muted)' }}>Quick Actions</h2>
                <div className="space-y-2.5">
                    {actions.map(a => (
                        <button key={a.path} onClick={() => navigate(a.path)}
                            className="uh-card w-full p-4 flex items-center justify-between text-left hover:scale-[1.01] transition-transform">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                    style={{ background: `${a.color}12`, border: `1px solid ${a.color}30` }}>
                                    {a.emoji}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{a.label}</p>
                                    <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>{a.sub}</p>
                                </div>
                            </div>
                            <span style={{ color: 'var(--uh-text-faint)' }}>›</span>
                        </button>
                    ))}

                    {/* Delete Account */}
                    <button onClick={handleDeleteAccount}
                        className="uh-card w-full p-4 flex items-center justify-between text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                style={{ background: 'rgba(217,58,58,0.08)', border: '1px solid rgba(217,58,58,0.2)' }}>
                                🗑️
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--uh-error)' }}>Delete My Account</p>
                                <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>Request account deletion</p>
                            </div>
                        </div>
                        <span style={{ color: 'var(--uh-text-faint)' }}>›</span>
                    </button>
                </div>
            </div>

            {/* Sign Out */}
            <button onClick={handleLogout}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'rgba(217,58,58,0.08)', color: 'var(--uh-error)', border: '1px solid rgba(217,58,58,0.2)' }}>
                🚪 Sign Out
            </button>
        </div>
    );
};

export default Profile;
