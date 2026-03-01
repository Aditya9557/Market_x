import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import DeliveryDriver from '../models/DeliveryDriver';
import { getRedis } from '../config/redis';

let io: SocketServer;

/**
 * Phase-1 Socket.io Server
 *
 * Rooms:
 *   zone:{zone}          — all online heroes in a zone receive order:new / order:taken
 *   delivery:{id}        — customer + hero for live location + OTP + status
 *   user:{userId}        — direct notifications (order:assigned, etc.)
 *   admin:monitor        — admin panel receives all status events
 *
 * Key events (server→client):
 *   order:new            — new delivery broadcast to heroes in zone
 *   order:taken          — another hero accepted → remove from queue
 *   order:assigned       — customer informed hero accepted
 *   hero:location:update → order:hero:location   — hero GPS relayed to customer
 *   otp:generated        — OTP shown to student
 *   delivery:completed   — celebration on customer side
 */
export const initSocket = (httpServer: HttpServer): SocketServer => {
    io = new SocketServer(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        // Increase throttling tolerance
        pingTimeout: 30000,
        pingInterval: 15000,
    });

    // JWT auth middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('Authentication required'));
        try {
            const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as { id: string; name?: string };
            (socket as any).userId = decoded.id;
            (socket as any).userName = decoded.name || 'Hero';
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', async (socket: Socket) => {
        const userId = (socket as any).userId as string;

        // Auto-join personal notification room
        socket.join(`user:${userId}`);

        // ── Hero: join zone room when going online ─────────────────────────
        socket.on('hero:join:zone', async (zone: string) => {
            socket.join(`zone:${zone || 'default'}`);
        });

        socket.on('hero:leave:zone', async (zone: string) => {
            socket.leave(`zone:${zone || 'default'}`);
        });

        // ── Hero: GPS location update (active delivery only) ───────────────
        // Throttled server-side with Redis 8s window per hero
        socket.on('hero:location:update', async (data: { lat: number; lng: number; deliveryId?: string }) => {
            const { lat, lng, deliveryId } = data;
            if (lat === undefined || lng === undefined) return;

            try {
                const r = getRedis();
                const throttleKey = `location-throttle:socket:${userId}`;
                const allowed = await r.set(throttleKey, '1', 'EX', 8, 'NX');

                if (!allowed) return; // throttled — ignore this update

                // Cache latest location in Redis
                await r.set(
                    `hero:location:${userId}`,
                    JSON.stringify({ lat, lng, lastUpdatedAt: new Date().toISOString() }),
                    'EX', 60
                );

                // Forward to customer tracking room
                if (deliveryId) {
                    io.to(`delivery:${deliveryId}`).emit('order:hero:location', {
                        coordinates: [lng, lat],
                        timestamp: new Date().toISOString(),
                    });
                }

                // Update DB location (non-blocking — fire and forget)
                DeliveryDriver.findOneAndUpdate(
                    { user: userId },
                    { currentLocation: { type: 'Point', coordinates: [lng, lat] }, lastLocationUpdate: new Date() }
                ).catch(() => { /* noop */ });

            } catch { /* noop */ }
        });

        // ── Legacy: support old 'location:update' event too ────────────────
        socket.on('location:update', async (data: { lng: number; lat: number; deliveryId?: string }) => {
            socket.emit('use:new:event', { message: 'Use hero:location:update instead' });
            // Still handle it for backward compat
            const { lng, lat, deliveryId } = data;
            if (deliveryId) {
                io.to(`delivery:${deliveryId}`).emit('driver:location', {
                    coordinates: [lng, lat],
                    timestamp: new Date().toISOString(),
                });
            }
        });

        // ── Customer: subscribe to delivery tracking ────────────────────────
        socket.on('track:subscribe', (deliveryId: string) => {
            socket.join(`delivery:${deliveryId}`);
        });

        socket.on('track:unsubscribe', (deliveryId: string) => {
            socket.leave(`delivery:${deliveryId}`);
        });

        // ── Hero: status change broadcast ───────────────────────────────────
        socket.on('delivery:statusChange', (data: { deliveryId: string; status: string }) => {
            io.to(`delivery:${data.deliveryId}`).emit('delivery:status', {
                status: data.status,
                timestamp: new Date().toISOString(),
            });
            // Admin visibility
            io.to('admin:monitor').emit('delivery:status:all', {
                deliveryId: data.deliveryId,
                status: data.status,
                timestamp: new Date().toISOString(),
            });
        });

        // ── Admin: join monitoring room ─────────────────────────────────────
        socket.on('admin:join', () => {
            socket.join('admin:monitor');
        });

        socket.on('disconnect', () => {
            // Clean up — nothing to do; Redis TTL handles location expiry
        });
    });

    return io;
};

export const getIO = (): SocketServer => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

/**
 * Broadcast a delivery status update to customers tracking this delivery
 */
export const broadcastDeliveryStatus = (deliveryId: string, status: string, data?: any) => {
    if (io) {
        io.to(`delivery:${deliveryId}`).emit('delivery:status', {
            status,
            timestamp: new Date().toISOString(),
            ...data,
        });
    }
};

/**
 * Broadcast new order to all online heroes in a zone
 */
export const broadcastOrderToZone = (zone: string, orderData: object) => {
    if (io) {
        io.to(`zone:${zone}`).emit('order:new', {
            ...orderData,
            timestamp: new Date().toISOString(),
        });
    }
};
