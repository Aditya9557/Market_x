/**
 * useHeroTracking — Phase-1
 *
 * During an active delivery (status: picked_up or in_transit):
 *  - Watches device GPS every 8s and emits hero:location:update via Socket.io
 *  - Also calls PUT /api/hero/location every 30s as HTTP fallback
 *
 * When delivery completes or component unmounts: clears the watch.
 */

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import API from '../api/axios';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://market-x-vppt.onrender.com';
const EMIT_INTERVAL_MS = 8000;     // 8s — per Phase-1 battery rules
const HTTP_FALLBACK_MS = 30000;    // 30s HTTP fallback

interface UseHeroTrackingOptions {
    deliveryId: string | null;
    active: boolean;           // only stream when true (picked_up / in_transit)
    token?: string;
}

const useHeroTracking = ({ deliveryId, active, token }: UseHeroTrackingOptions) => {
    const socketRef = useRef<Socket | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const emitIntervalRef = useRef<number | null>(null);
    const httpFallbackRef = useRef<number | null>(null);
    const latestCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

    const cleanup = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (emitIntervalRef.current !== null) {
            clearInterval(emitIntervalRef.current);
            emitIntervalRef.current = null;
        }
        if (httpFallbackRef.current !== null) {
            clearInterval(httpFallbackRef.current);
            httpFallbackRef.current = null;
        }
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!active || !deliveryId) {
            cleanup();
            return;
        }

        if (!('geolocation' in navigator)) {
            console.warn('[useHeroTracking] Geolocation not available');
            return;
        }

        // Connect socket
        const socket = io(SOCKET_URL, { auth: { token } });
        socketRef.current = socket;

        // Watch GPS position (high accuracy, short interval)
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                latestCoordsRef.current = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };
            },
            (err) => console.warn('[useHeroTracking] GPS error:', err),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        ) as unknown as number;

        // Emit via WebSocket every 8s (server also throttles at 8s)
        emitIntervalRef.current = window.setInterval(() => {
            const coords = latestCoordsRef.current;
            if (coords && socketRef.current?.connected) {
                socketRef.current.emit('hero:location:update', {
                    lat: coords.lat,
                    lng: coords.lng,
                    deliveryId,
                });
            }
        }, EMIT_INTERVAL_MS);

        // HTTP fallback every 30s
        httpFallbackRef.current = window.setInterval(async () => {
            const coords = latestCoordsRef.current;
            if (coords) {
                try {
                    await API.post('/hero/location', { lat: coords.lat, lng: coords.lng });
                } catch { /* noop */ }
            }
        }, HTTP_FALLBACK_MS);

        return cleanup;
    }, [active, deliveryId, token, cleanup]);

    return { latestCoords: latestCoordsRef.current };
};

export default useHeroTracking;
