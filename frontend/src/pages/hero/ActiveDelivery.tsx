import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import API from '../../api/axios';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://market-x-2.onrender.com';

const statusFlow = ['accepted', 'picked_up', 'in_transit', 'delivered'];
const statusInfo: Record<string, { label: string; emoji: string; nextLabel: string }> = {
    accepted: { label: 'Heading to Store', emoji: '🏪', nextLabel: 'I\'ve Picked Up the Order' },
    picked_up: { label: 'Order Picked Up', emoji: '📦', nextLabel: 'Start Delivery' },
    in_transit: { label: 'On the Way', emoji: '🏃', nextLabel: 'Mark as Delivered ✅' },
    delivered: { label: 'Delivered!', emoji: '✅', nextLabel: '' },
};

const ActiveDelivery = () => {
    const [delivery, setDelivery] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [locationWatch, setLocationWatch] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const watchIdRef = useRef<number | null>(null);

    const fetchDelivery = async () => {
        try { const { data } = await API.get('/hero/active-delivery'); setDelivery(data); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDelivery(); }, []);

    useEffect(() => {
        if (!delivery) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        const socket = io(SOCKET_URL, { auth: { token } });
        socket.on('connect', () => console.log('🔌 Socket connected'));
        socketRef.current = socket;
        return () => { socket.disconnect(); socketRef.current = null; };
    }, [delivery?._id]);

    const startLocationTracking = useCallback(() => {
        if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
        const id = navigator.geolocation.watchPosition(
            pos => {
                const { longitude: lng, latitude: lat } = pos.coords;
                if (socketRef.current && delivery?._id) socketRef.current.emit('location:update', { lng, lat, deliveryId: delivery._id });
                API.post('/hero/location', { lng, lat }).catch(() => { });
            },
            err => console.error('Geo error:', err),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
        watchIdRef.current = id; setLocationWatch(true);
    }, [delivery?._id]);

    const stopLocationTracking = () => {
        if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
        setLocationWatch(false);
    };

    useEffect(() => () => stopLocationTracking(), []);

    const advanceStatus = async () => {
        if (!delivery) return;
        const next = { accepted: 'picked_up', picked_up: 'in_transit', in_transit: 'delivered' }[delivery.status as string];
        if (!next) return;
        setUpdating(true);
        try {
            const { data } = await API.put(`/hero/delivery/${delivery._id}/status`, { status: next });
            if (socketRef.current) socketRef.current.emit('delivery:statusChange', { deliveryId: delivery._id, status: next });
            if (next === 'delivered') stopLocationTracking();
            setDelivery(data.delivery);
        } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
        finally { setUpdating(false); }
    };

    if (loading) return <div className="flex justify-center items-center py-32"><div className="uh-spinner" /></div>;

    if (!delivery) return (
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
            <p className="text-6xl mb-4">🎧</p>
            <h1 className="text-2xl font-black text-white mb-2">No Active Delivery</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--uh-text-muted)' }}>Go to Available Orders to pick up a delivery.</p>
            <Link to="/hero/orders" className="uh-btn-primary px-8 py-3 inline-block">Browse Orders</Link>
        </div>
    );

    const currentInfo = statusInfo[delivery.status] || statusInfo.accepted;
    const currentIdx = statusFlow.indexOf(delivery.status);

    return (
        <div className="uh-page max-w-3xl mx-auto px-6 py-8">
            <h1 className="text-3xl font-black text-white mb-6" style={{ letterSpacing: '-0.5px' }}>Active Delivery</h1>

            {/* Progress Stepper */}
            <div className="uh-card p-6 mb-5">
                <div className="flex items-center mb-6">
                    {statusFlow.map((status, idx) => {
                        const info = statusInfo[status];
                        const isActive = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;
                        return (
                            <div key={status} className="flex items-center flex-1">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                                    style={{
                                        background: isCurrent ? 'var(--uh-coral)' : isActive ? 'var(--uh-green)' : 'rgba(255,255,255,0.06)',
                                        color: isActive ? 'white' : 'var(--uh-text-faint)',
                                        transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                                        boxShadow: isCurrent ? '0 0 20px rgba(255,107,87,0.4)' : 'none',
                                    }}>
                                    {isActive ? info.emoji : idx + 1}
                                </div>
                                {idx < statusFlow.length - 1 && (
                                    <div className="flex-1 h-1 mx-2 rounded"
                                        style={{ background: isActive && currentIdx > idx ? 'var(--uh-green)' : 'rgba(255,255,255,0.06)' }} />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="text-center">
                    <p className="text-xl font-black text-white">{currentInfo.emoji} {currentInfo.label}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--uh-text-muted)' }}>
                        Step {currentIdx + 1} of {statusFlow.length}
                    </p>
                </div>
            </div>

            {/* Delivery Info */}
            <div className="uh-card p-6 mb-5">
                <h2 className="text-base font-bold text-white mb-4">📋 Delivery Info</h2>
                <div className="space-y-3">
                    {[
                        { label: 'Order', value: `#${(delivery.order as any)?.orderNumber || '—'}`, mono: true },
                        { label: 'Customer', value: (delivery.customer as any)?.name || '—' },
                        { label: 'Pickup', value: delivery.pickupAddress, isAddress: true },
                        { label: 'Drop-off', value: delivery.deliveryAddress, isAddress: true },
                    ].map(({ label, value, mono, isAddress }) => (
                        <div key={label} className="flex justify-between items-start gap-3">
                            <span className="text-sm shrink-0" style={{ color: 'var(--uh-text-muted)' }}>{label}</span>
                            <div className="text-right">
                                <span className={`text-sm text-white ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
                                {isAddress && value && value !== '—' && (
                                    <div className="mt-1">
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value as string)}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="text-xs font-bold inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                                            style={{ color: 'var(--uh-coral)', background: 'rgba(255,107,87,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                                            🗺️ Open in Maps
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>Delivery Fee</span>
                        <span className="text-lg font-black" style={{ color: 'var(--uh-green)' }}>₹{delivery.deliveryFee?.toFixed(0)}</span>
                    </div>
                    {delivery.tip > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>Tip 🎁</span>
                            <span className="text-lg font-black" style={{ color: '#FFCC00' }}>₹{delivery.tip?.toFixed(0)}</span>
                        </div>
                    )}
                    {delivery.notes && (
                        <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--uh-card-border)', color: 'var(--uh-text-muted)' }}>
                            📝 {delivery.notes}
                        </div>
                    )}
                </div>
            </div>

            {/* Live Location Tracking */}
            <div className="uh-card p-5 mb-5 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-white">📍 Live Tracking</h3>
                    <p className="text-sm mt-0.5" style={{ color: locationWatch ? 'var(--uh-green)' : 'var(--uh-text-muted)' }}>
                        {locationWatch ? '🟢 Broadcasting your location to customer' : '🔴 Location sharing is off'}
                    </p>
                </div>
                <button onClick={locationWatch ? stopLocationTracking : startLocationTracking}
                    className={locationWatch ? 'uh-btn-ghost px-4 py-2 text-sm' : 'uh-btn-primary px-4 py-2 text-sm'}
                    style={locationWatch ? { color: 'var(--uh-error)', borderColor: 'rgba(217,58,58,0.3)' } : {}}>
                    {locationWatch ? 'Stop Sharing' : 'Start Sharing'}
                </button>
            </div>

            {/* Action Button */}
            {delivery.status !== 'delivered' && (
                <button onClick={advanceStatus} disabled={updating} className="uh-btn-primary w-full py-4 text-base">
                    {updating
                        ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Updating...</span>
                        : `${currentInfo.emoji} ${currentInfo.nextLabel}`}
                </button>
            )}

            {/* Delivered Celebration */}
            {delivery.status === 'delivered' && (
                <div className="uh-card text-center py-10">
                    <p className="text-6xl mb-4">🎉</p>
                    <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--uh-green)' }}>Delivery Complete!</h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--uh-text-muted)' }}>
                        You earned{' '}
                        <span className="font-black text-lg" style={{ color: 'var(--uh-green)' }}>
                            ₹{(delivery.deliveryFee + (delivery.tip || 0)).toFixed(0)}
                        </span>
                        {' '}💪
                    </p>
                    <Link to="/hero" className="uh-btn-outline px-8 py-2.5 inline-block">Back to Dashboard</Link>
                </div>
            )}
        </div>
    );
};

export default ActiveDelivery;
