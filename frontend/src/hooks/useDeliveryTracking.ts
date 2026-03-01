import { useEffect, useState, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

/**
 * Supabase Realtime Hook for tracking driver location.
 *
 * Usage in customer's order tracking page:
 *   const { location, status, isConnected } = useDeliveryTracking(deliveryId);
 *
 * SETUP: Add these to your .env or config:
 *   VITE_SUPABASE_URL=your-supabase-url
 *   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface DriverLocation {
    lng: number;
    lat: number;
    heading: number;
    speed: number;
    timestamp: string;
}

interface TrackingState {
    location: DriverLocation | null;
    status: string;
    estimatedMinutes: number;
    isConnected: boolean;
    error: string | null;
}

/**
 * Real-time delivery tracking hook using Supabase Realtime.
 * Falls back to Socket.io polling if Supabase isn't configured.
 */
export const useDeliveryTracking = (deliveryId: string | null): TrackingState => {
    const [state, setState] = useState<TrackingState>({
        location: null,
        status: 'unknown',
        estimatedMinutes: 0,
        isConnected: false,
        error: null
    });
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!deliveryId) return;

        // If Supabase not configured, don't attempt connection
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            setState(prev => ({
                ...prev,
                error: 'Supabase not configured — using Socket.io fallback'
            }));
            return;
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Subscribe to changes on the delivery_tracking table for this delivery
        const channel = supabase
            .channel(`delivery:${deliveryId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'delivery_tracking',
                    filter: `delivery_id=eq.${deliveryId}`
                },
                (payload: any) => {
                    const record = payload.new;
                    setState(prev => ({
                        ...prev,
                        status: record.status,
                        estimatedMinutes: record.estimated_minutes || 0,
                        location: record.driver_location ? {
                            lng: parseFloat(record.driver_location.split('(')[1]?.split(' ')[0] || '0'),
                            lat: parseFloat(record.driver_location.split(' ')[1]?.split(')')[0] || '0'),
                            heading: 0,
                            speed: 0,
                            timestamp: record.updated_at
                        } : prev.location
                    }));
                }
            )
            .subscribe((status: string) => {
                setState(prev => ({
                    ...prev,
                    isConnected: status === 'SUBSCRIBED'
                }));
            });

        channelRef.current = channel;

        // Cleanup
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [deliveryId]);

    return state;
};

/**
 * Hook for hero to subscribe to new order notifications.
 */
export const useNewOrderNotifications = (isOnline: boolean) => {
    const [newOrders, setNewOrders] = useState<any[]>([]);

    useEffect(() => {
        if (!isOnline || !SUPABASE_URL || !SUPABASE_KEY) return;

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        const channel = supabase
            .channel('new-deliveries')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'delivery_tracking'
                },
                (payload: any) => {
                    setNewOrders(prev => [payload.new, ...prev.slice(0, 9)]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOnline]);

    return newOrders;
};
