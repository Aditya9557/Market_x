import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import API from '../../api/axios';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://market-x-vppt.onrender.com';

const statusFlow = ['confirmed', 'preparing', 'ready', 'hero_assigned', 'picked_up', 'in_transit', 'delivered'];

const statusInfo: Record<string, { label: string; emoji: string; desc: string }> = {
    pending: { label: 'Order Placed', emoji: '📝', desc: 'Waiting for the store to confirm' },
    confirmed: { label: 'Confirmed', emoji: '✓', desc: 'The store has confirmed your order' },
    preparing: { label: 'Preparing', emoji: '👨‍🍳', desc: 'Your order is being prepared' },
    ready: { label: 'Ready', emoji: '✅', desc: 'Your order is ready for pickup' },
    hero_assigned: { label: 'Hero Assigned', emoji: '🦸', desc: 'A delivery hero is heading to the store' },
    picked_up: { label: 'Picked Up', emoji: '📦', desc: 'Hero has picked up your order' },
    in_transit: { label: 'On the Way', emoji: '🏃', desc: 'Your order is on the way!' },
    delivered: { label: 'Delivered', emoji: '🎉', desc: 'Your order has been delivered' },
    cancelled: { label: 'Cancelled', emoji: '✕', desc: 'This order was cancelled' },
};

interface DriverLocation {
    coordinates: [number, number];
    timestamp: string;
}

const TrackDelivery = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [order, setOrder] = useState<any>(null);
    const [delivery, setDelivery] = useState<any>(null);
    const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const socketRef = useRef<Socket | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch order + delivery info
    const fetchOrder = async () => {
        try {
            const { data } = await API.get(`/orders/${orderId}`);
            setOrder(data);

            // If delivery info is included in the order response
            if (data.delivery) {
                setDelivery(data.delivery);

                // Fetch driver's current location
                try {
                    const deliveryId = typeof data.delivery === 'string' ? data.delivery : data.delivery._id;
                    const { data: trackData } = await API.get(`/hero/track/${deliveryId}`);
                    if (trackData.location) {
                        setDriverLocation(trackData.location);
                    }
                } catch {
                    // Tracking info not available yet — that's ok
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load order');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orderId) fetchOrder();
    }, [orderId]);

    // Connect to Socket.io for real-time tracking
    useEffect(() => {
        if (!delivery?._id) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = io(SOCKET_URL, { auth: { token } });

        socket.on('connect', () => {
            console.log('🔌 Tracking socket connected');
            socket.emit('track:subscribe', delivery._id);
        });

        // Listen for driver location updates
        socket.on('driver:location', (data: DriverLocation) => {
            setDriverLocation(data);
        });

        // Listen for delivery status changes
        socket.on('delivery:status', (data: { status: string }) => {
            setDelivery((prev: any) => prev ? { ...prev, status: data.status } : prev);
            // Refresh order to get latest status
            fetchOrder();
        });

        socketRef.current = socket;

        return () => {
            if (delivery?._id) socket.emit('track:unsubscribe', delivery._id);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [delivery?._id]);

    // Also poll for location every 10 seconds as a fallback
    useEffect(() => {
        if (!delivery?._id) return;

        pollRef.current = setInterval(async () => {
            try {
                const { data: trackData } = await API.get(`/hero/track/${delivery._id}`);
                if (trackData.location) {
                    setDriverLocation(trackData.location);
                }
                if (trackData.delivery) {
                    setDelivery(trackData.delivery);
                }
            } catch {
                // ignore polling errors
            }
        }, 10000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [delivery?._id]);

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="uh-spinner" />
        </div>
    );

    if (error || !order) return (
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
            <p className="text-6xl mb-4">😕</p>
            <h1 className="text-2xl font-black text-white mb-2">Order Not Found</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--uh-text-muted)' }}>{error || 'Could not load order details'}</p>
            <Link to="/orders" className="uh-btn-primary px-8 py-3 inline-block">Back to Orders</Link>
        </div>
    );

    const currentStatus = delivery?.status || order.status;
    const info = statusInfo[currentStatus] || statusInfo.pending;
    const currentIdx = statusFlow.indexOf(currentStatus);
    const isActive = ['hero_assigned', 'picked_up', 'in_transit'].includes(currentStatus);
    const isDelivered = currentStatus === 'delivered';
    const lastUpdateTime = driverLocation?.timestamp
        ? new Date(driverLocation.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : null;

    return (
        <div className="uh-page max-w-3xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>
                        Track Order
                    </h1>
                    <p className="text-sm font-mono" style={{ color: 'var(--uh-text-muted)' }}>
                        {order.orderNumber}
                    </p>
                </div>
                <Link to="/orders" className="uh-btn-ghost px-4 py-2 text-sm">
                    ← Back
                </Link>
            </div>

            {/* Current Status Hero Card */}
            <div
                className="uh-card p-6 mb-5 text-center"
                style={{
                    background: isActive
                        ? 'linear-gradient(135deg, rgba(255,107,87,0.08), rgba(255,59,92,0.04))'
                        : isDelivered
                            ? 'linear-gradient(135deg, rgba(15,157,88,0.08), rgba(15,157,88,0.04))'
                            : undefined,
                    borderColor: isActive ? 'rgba(255,107,87,0.2)' : isDelivered ? 'rgba(15,157,88,0.2)' : undefined,
                }}
            >
                <div
                    className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center text-4xl"
                    style={{
                        background: isActive
                            ? 'linear-gradient(135deg, rgba(255,107,87,0.15), rgba(255,59,92,0.1))'
                            : isDelivered
                                ? 'linear-gradient(135deg, rgba(15,157,88,0.15), rgba(15,157,88,0.1))'
                                : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? 'rgba(255,107,87,0.3)' : isDelivered ? 'rgba(15,157,88,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                >
                    {info.emoji}
                </div>
                <h2 className="text-2xl font-black text-white mb-1">{info.label}</h2>
                <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>{info.desc}</p>

                {isActive && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--uh-green)' }} />
                        <span className="text-xs font-bold" style={{ color: 'var(--uh-green)' }}>Live Tracking Active</span>
                    </div>
                )}
            </div>

            {/* Progress Stepper */}
            <div className="uh-card p-5 mb-5">
                <h3 className="text-sm font-bold text-white mb-4">Order Progress</h3>
                <div className="space-y-0">
                    {statusFlow.map((status, idx) => {
                        const si = statusInfo[status] || statusInfo.pending;
                        const isPast = currentIdx >= idx;
                        const isCurrent = currentIdx === idx;
                        const isLast = idx === statusFlow.length - 1;

                        return (
                            <div key={status} className="flex items-start gap-3">
                                {/* Dot + Line */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all"
                                        style={{
                                            background: isCurrent
                                                ? 'var(--uh-coral)'
                                                : isPast
                                                    ? 'var(--uh-green)'
                                                    : 'rgba(255,255,255,0.06)',
                                            color: isPast || isCurrent ? 'white' : 'var(--uh-text-faint)',
                                            boxShadow: isCurrent ? '0 0 16px rgba(255,107,87,0.4)' : 'none',
                                        }}
                                    >
                                        {isPast && !isCurrent ? '✓' : si.emoji}
                                    </div>
                                    {!isLast && (
                                        <div
                                            className="w-0.5 h-8"
                                            style={{
                                                background: isPast && currentIdx > idx
                                                    ? 'var(--uh-green)'
                                                    : 'rgba(255,255,255,0.06)',
                                            }}
                                        />
                                    )}
                                </div>
                                {/* Label */}
                                <div className="pt-1">
                                    <p
                                        className="text-sm font-semibold"
                                        style={{
                                            color: isCurrent ? 'white' : isPast ? 'var(--uh-text-muted)' : 'var(--uh-text-faint)',
                                        }}
                                    >
                                        {si.label}
                                    </p>
                                    {isCurrent && (
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--uh-text-muted)' }}>
                                            {si.desc}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hero Location Card */}
            {isActive && (
                <div className="uh-card p-5 mb-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            📍 Hero Location
                            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--uh-green)' }} />
                        </h3>
                        {lastUpdateTime && (
                            <span className="text-xs" style={{ color: 'var(--uh-text-faint)' }}>
                                Updated: {lastUpdateTime}
                            </span>
                        )}
                    </div>

                    {driverLocation ? (
                        <div>
                            {/* Location info */}
                            <div className="flex items-center gap-4 mb-3">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,107,87,0.15), rgba(255,59,92,0.1))',
                                        border: '1px solid rgba(255,107,87,0.3)',
                                    }}
                                >
                                    🦸
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">
                                        {delivery?.driverName || 'Your Hero'}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                        {currentStatus === 'hero_assigned' && 'Heading to the store'}
                                        {currentStatus === 'picked_up' && 'Has picked up your order'}
                                        {currentStatus === 'in_transit' && 'On the way to you!'}
                                    </p>
                                </div>
                            </div>

                            {/* Map link */}
                            <a
                                href={`https://www.google.com/maps?q=${driverLocation.coordinates[1]},${driverLocation.coordinates[0]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 rounded-xl text-center text-sm font-bold transition-all hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,107,87,0.12), rgba(255,107,87,0.06))',
                                    border: '1px solid rgba(255,107,87,0.3)',
                                    color: '#FF6B57',
                                }}
                            >
                                🗺️ Open Hero's Location in Maps
                            </a>

                            {/* Coordinates */}
                            <div className="mt-3 flex items-center justify-center gap-4">
                                <span className="text-xs font-mono" style={{ color: 'var(--uh-text-faint)' }}>
                                    {driverLocation.coordinates[1].toFixed(6)}°N,{' '}
                                    {driverLocation.coordinates[0].toFixed(6)}°E
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-3xl"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                📡
                            </div>
                            <p className="text-sm font-bold text-white mb-1">Waiting for location</p>
                            <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                The hero hasn't shared their location yet. It will appear automatically.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Delivery Details */}
            <div className="uh-card p-5 mb-5">
                <h3 className="text-sm font-bold text-white mb-3">📋 Delivery Details</h3>
                <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--uh-text-muted)' }}>Delivery Address</span>
                        <span className="text-white font-medium text-right max-w-[60%]">{order.deliveryAddress || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--uh-text-muted)' }}>Total</span>
                        <span className="font-black" style={{ color: 'var(--uh-green)' }}>₹{order.total?.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--uh-text-muted)' }}>Payment</span>
                        <span className="text-white capitalize">{order.paymentStatus || 'pending'}</span>
                    </div>
                    {delivery?.driverName && (
                        <div className="flex justify-between text-sm">
                            <span style={{ color: 'var(--uh-text-muted)' }}>Hero</span>
                            <span className="text-white font-medium">🦸 {delivery.driverName}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Delivered Celebration */}
            {isDelivered && (
                <div className="uh-card text-center py-10">
                    <p className="text-6xl mb-4">🎉</p>
                    <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--uh-green)' }}>Order Delivered!</h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--uh-text-muted)' }}>
                        Enjoy your order! Rate your hero from Order History.
                    </p>
                    <Link to="/orders" className="uh-btn-outline px-8 py-2.5 inline-block">Back to Orders</Link>
                </div>
            )}
        </div>
    );
};

export default TrackDelivery;
