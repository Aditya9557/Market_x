import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface HeroProfile {
    isHero: boolean;
    isOnline: boolean;
    isAvailable: boolean;
    rating: number;
    totalDeliveries: number;
    totalEarnings: number;
    reliabilityScore: number;
    vehicleType: string;
}

const LEVEL_THRESHOLDS = [
    { min: 0, label: 'Rookie', emoji: '🌱', color: '#6E7581' },
    { min: 10, label: 'Rising Star', emoji: '⭐', color: '#FFCC00' },
    { min: 30, label: 'Campus Hero', emoji: '🦸', color: '#FF6B57' },
    { min: 75, label: 'Legend', emoji: '👑', color: '#a78bfa' },
    { min: 150, label: 'Campus Legend', emoji: '💎', color: '#0F9D58' },
];

const getLevel = (deliveries: number) => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (deliveries >= LEVEL_THRESHOLDS[i].min) return LEVEL_THRESHOLDS[i];
    }
    return LEVEL_THRESHOLDS[0];
};

const getNextLevel = (deliveries: number) => {
    for (const level of LEVEL_THRESHOLDS) {
        if (deliveries < level.min) return level;
    }
    return null;
};

const HeroProfileCard = () => {
    const { isAuthenticated } = useAuth();
    const [profile, setProfile] = useState<HeroProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    const fetchProfile = async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await API.get('/hero/status');
            if (data.isHero) {
                setProfile(data);
            }
        } catch {
            // Not a hero or error — silently fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProfile(); }, [isAuthenticated]);

    const handleToggle = async () => {
        setToggling(true);
        try {
            const { data } = await API.post('/hero/toggle');
            setProfile(prev => prev ? { ...prev, isOnline: data.isOnline, isAvailable: data.isAvailable } : null);
        } catch (err) {
            console.error(err);
        } finally {
            setToggling(false);
        }
    };

    if (loading || !profile) return null;

    const level = getLevel(profile.totalDeliveries);
    const nextLevel = getNextLevel(profile.totalDeliveries);
    const progress = nextLevel
        ? ((profile.totalDeliveries - (LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.indexOf(level)]?.min || 0)) /
            (nextLevel.min - (LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.indexOf(level)]?.min || 0))) * 100
        : 100;

    const pointsWarning = profile.reliabilityScore < 3.0;
    const pointsCritical = profile.reliabilityScore < 2.0;

    return (
        <div
            className="mb-6 rounded-2xl overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, rgba(15,157,88,0.06) 0%, rgba(255,107,87,0.04) 100%)',
                border: `1px solid ${profile.isOnline ? 'rgba(15,157,88,0.25)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: profile.isOnline ? '0 4px 24px rgba(15,157,88,0.08)' : 'none',
            }}
        >
            <div className="p-4">
                {/* Top row: Hero badge + Toggle */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: `${level.color}20`, border: `1px solid ${level.color}40` }}
                        >
                            {level.emoji}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-white">{level.label}</h3>
                                {profile.isOnline && <div className="uh-online-dot" style={{ width: 7, height: 7 }} />}
                            </div>
                            <p className="text-[10px]" style={{ color: 'var(--uh-text-muted)' }}>
                                {profile.totalDeliveries} deliveries · {profile.rating?.toFixed(1) || '5.0'} ⭐
                            </p>
                        </div>
                    </div>

                    {/* Quick Toggle */}
                    <button
                        onClick={handleToggle}
                        disabled={toggling}
                        className="relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none shrink-0"
                        style={{
                            background: profile.isOnline ? 'var(--uh-green)' : 'rgba(255,255,255,0.1)',
                            boxShadow: profile.isOnline ? '0 0 12px rgba(15,157,88,0.4)' : 'none',
                        }}
                        aria-label={profile.isOnline ? 'Go Offline' : 'Go Online'}
                    >
                        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${profile.isOnline ? 'left-7' : 'left-0.5'}`} />
                    </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-sm font-black" style={{ color: 'var(--uh-green)' }}>₹{profile.totalEarnings?.toFixed(0) || '0'}</p>
                        <p className="text-[9px]" style={{ color: 'var(--uh-text-faint)' }}>Earned</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-sm font-black" style={{ color: 'var(--uh-coral)' }}>{profile.totalDeliveries}</p>
                        <p className="text-[9px]" style={{ color: 'var(--uh-text-faint)' }}>Deliveries</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-sm font-black" style={{ color: pointsCritical ? '#D93A3A' : pointsWarning ? '#FFCC00' : 'var(--uh-green)' }}>
                            {profile.reliabilityScore?.toFixed(1) || '5.0'}
                        </p>
                        <p className="text-[9px]" style={{ color: 'var(--uh-text-faint)' }}>Score</p>
                    </div>
                </div>

                {/* Level progress */}
                {nextLevel && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold" style={{ color: level.color }}>{level.emoji} {level.label}</span>
                            <span className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>
                                {profile.totalDeliveries}/{nextLevel.min} → {nextLevel.emoji} {nextLevel.label}
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${Math.min(progress, 100)}%`,
                                    background: `linear-gradient(90deg, ${level.color}, ${nextLevel.color})`,
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Reliability Warning */}
                {pointsWarning && (
                    <div
                        className="p-2 rounded-lg mb-3 flex items-start gap-2"
                        style={{
                            background: pointsCritical ? 'rgba(217,58,58,0.08)' : 'rgba(255,204,0,0.06)',
                            border: `1px solid ${pointsCritical ? 'rgba(217,58,58,0.2)' : 'rgba(255,204,0,0.15)'}`,
                        }}
                    >
                        <span className="text-sm">{pointsCritical ? '🔴' : '⚠️'}</span>
                        <div>
                            <p className="text-[10px] font-bold" style={{ color: pointsCritical ? '#D93A3A' : '#FFCC00' }}>
                                {pointsCritical ? 'Account at risk — suspended if score stays below 2.0' : 'Reliability score dropping — avoid cancellations'}
                            </p>
                            <p className="text-[9px]" style={{ color: 'var(--uh-text-faint)' }}>
                                Complete deliveries on time and maintain good ratings to recover.
                            </p>
                        </div>
                    </div>
                )}

                {/* Quick actions */}
                <div className="flex gap-2">
                    <Link
                        to="/hero"
                        className="flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all"
                        style={{
                            background: profile.isOnline ? 'linear-gradient(135deg, rgba(15,157,88,0.15), rgba(15,157,88,0.08))' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${profile.isOnline ? 'rgba(15,157,88,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            color: profile.isOnline ? '#0F9D58' : 'var(--uh-text-muted)',
                        }}
                    >
                        {profile.isOnline ? '🟢 Hero Dashboard' : '🦸 Hero Dashboard'}
                    </Link>
                    <Link
                        to="/hero/orders"
                        className="flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all"
                        style={{
                            background: 'rgba(255,107,87,0.06)',
                            border: '1px solid rgba(255,107,87,0.15)',
                            color: 'var(--uh-coral)',
                        }}
                    >
                        📋 Available Orders
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default HeroProfileCard;
