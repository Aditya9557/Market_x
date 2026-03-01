import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Client for real-time features.
 *
 * DUAL-DATABASE STRATEGY:
 * - MongoDB: Main data (users, stores, products, orders)
 * - Supabase/PostgreSQL: Real-time features (driver locations, delivery tracking)
 *
 * SETUP REQUIRED:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env
 * 3. Run the SQL migrations below in Supabase SQL Editor
 *
 * SQL MIGRATIONS (run in Supabase SQL Editor):
 *
 * -- Enable PostGIS for geospatial queries
 * CREATE EXTENSION IF NOT EXISTS postgis;
 *
 * -- Driver locations table with PostGIS
 * CREATE TABLE driver_locations (
 *     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     driver_id TEXT NOT NULL UNIQUE,
 *     driver_name TEXT,
 *     location GEOGRAPHY(POINT, 4326),
 *     heading FLOAT DEFAULT 0,
 *     speed FLOAT DEFAULT 0,
 *     is_online BOOLEAN DEFAULT false,
 *     is_available BOOLEAN DEFAULT false,
 *     vehicle_type TEXT DEFAULT 'walk',
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_driver_locations_geo ON driver_locations USING GIST(location);
 * CREATE INDEX idx_driver_online ON driver_locations(is_online, is_available);
 *
 * -- Delivery tracking table (live updates)
 * CREATE TABLE delivery_tracking (
 *     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     delivery_id TEXT NOT NULL,
 *     driver_id TEXT NOT NULL,
 *     customer_id TEXT NOT NULL,
 *     order_id TEXT NOT NULL,
 *     status TEXT DEFAULT 'assigned',
 *     driver_location GEOGRAPHY(POINT, 4326),
 *     pickup_location GEOGRAPHY(POINT, 4326),
 *     dropoff_location GEOGRAPHY(POINT, 4326),
 *     estimated_minutes INTEGER DEFAULT 30,
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_delivery_tracking_ids ON delivery_tracking(delivery_id, customer_id);
 *
 * -- Enable Realtime for these tables
 * ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
 * ALTER PUBLICATION supabase_realtime ADD TABLE delivery_tracking;
 *
 * -- Row Level Security (RLS) for location privacy
 * ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
 *
 * -- Policy: Only the platform backend can write (using service key)
 * CREATE POLICY "Service can manage all" ON driver_locations
 *     FOR ALL USING (true) WITH CHECK (true);
 *
 * CREATE POLICY "Service can manage all" ON delivery_tracking
 *     FOR ALL USING (true) WITH CHECK (true);
 *
 * -- Policy: Customers can only read tracking for their own deliveries
 * -- (When using anon key from frontend with custom auth)
 * CREATE POLICY "Customer reads own tracking" ON delivery_tracking
 *     FOR SELECT USING (customer_id = current_setting('request.jwt.claims')::json->>'sub');
 */

let supabase: SupabaseClient | null = null;

/**
 * Initialize Supabase client. Returns null if credentials aren't configured.
 */
export const getSupabase = (): SupabaseClient | null => {
    if (supabase) return supabase;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key || url === 'your-supabase-url') {
        console.log('⚠️  Supabase not configured. Real-time features will fall back to Socket.io.');
        return null;
    }

    supabase = createClient(url, key);
    console.log('✅ Supabase connected for real-time features');
    return supabase;
};

// ─── DRIVER LOCATION OPERATIONS ────────────────────────────

/**
 * Upsert a driver's location in the PostGIS-enabled table.
 * Called every 5 seconds when driver is online.
 */
export const updateDriverLocation = async (
    driverId: string,
    driverName: string,
    lng: number,
    lat: number,
    heading: number = 0,
    speed: number = 0,
    isOnline: boolean = true,
    isAvailable: boolean = true,
    vehicleType: string = 'walk'
) => {
    const sb = getSupabase();
    if (!sb) return null;

    const { data, error } = await sb
        .from('driver_locations')
        .upsert({
            driver_id: driverId,
            driver_name: driverName,
            location: `POINT(${lng} ${lat})`,
            heading,
            speed,
            is_online: isOnline,
            is_available: isAvailable,
            vehicle_type: vehicleType,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'driver_id'
        });

    if (error) console.error('Supabase location update error:', error);
    return data;
};

/**
 * Find the K nearest available drivers using PostGIS KNN query.
 * This is the core dispatch algorithm.
 */
export const findNearestDrivers = async (
    lng: number,
    lat: number,
    radiusMeters: number = 5000,
    limit: number = 5
) => {
    const sb = getSupabase();
    if (!sb) return [];

    // Use PostGIS ST_DWithin for radius filter + order by distance
    const { data, error } = await sb.rpc('find_nearest_drivers', {
        search_lng: lng,
        search_lat: lat,
        radius_meters: radiusMeters,
        max_results: limit
    });

    if (error) {
        console.error('Nearest drivers query error:', error);
        return [];
    }

    return data || [];
};

/**
 * SQL function to create in Supabase (for findNearestDrivers):
 *
 * CREATE OR REPLACE FUNCTION find_nearest_drivers(
 *     search_lng FLOAT,
 *     search_lat FLOAT,
 *     radius_meters FLOAT DEFAULT 5000,
 *     max_results INTEGER DEFAULT 5
 * )
 * RETURNS TABLE(
 *     driver_id TEXT,
 *     driver_name TEXT,
 *     vehicle_type TEXT,
 *     distance_meters FLOAT
 * )
 * LANGUAGE SQL
 * AS $$
 *     SELECT
 *         driver_id,
 *         driver_name,
 *         vehicle_type,
 *         ST_Distance(
 *             location,
 *             ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
 *         ) AS distance_meters
 *     FROM driver_locations
 *     WHERE is_online = true
 *       AND is_available = true
 *       AND ST_DWithin(
 *           location,
 *           ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
 *           radius_meters
 *       )
 *     ORDER BY distance_meters ASC
 *     LIMIT max_results;
 * $$;
 */

// ─── DELIVERY TRACKING ─────────────────────────────────────

/**
 * Create a tracking record when a delivery is assigned.
 * Supabase Realtime will auto-broadcast changes to subscribers.
 */
export const createTrackingRecord = async (
    deliveryId: string,
    driverId: string,
    customerId: string,
    orderId: string,
    pickupLng?: number,
    pickupLat?: number,
    dropoffLng?: number,
    dropoffLat?: number
) => {
    const sb = getSupabase();
    if (!sb) return null;

    const record: any = {
        delivery_id: deliveryId,
        driver_id: driverId,
        customer_id: customerId,
        order_id: orderId,
        status: 'assigned',
        updated_at: new Date().toISOString()
    };

    if (pickupLng && pickupLat) {
        record.pickup_location = `POINT(${pickupLng} ${pickupLat})`;
    }
    if (dropoffLng && dropoffLat) {
        record.dropoff_location = `POINT(${dropoffLng} ${dropoffLat})`;
    }

    const { data, error } = await sb
        .from('delivery_tracking')
        .insert(record);

    if (error) console.error('Create tracking error:', error);
    return data;
};

/**
 * Update tracking record — triggers Supabase Realtime broadcast to customer.
 */
export const updateTrackingStatus = async (
    deliveryId: string,
    status: string,
    driverLng?: number,
    driverLat?: number,
    estimatedMinutes?: number
) => {
    const sb = getSupabase();
    if (!sb) return null;

    const update: any = {
        status,
        updated_at: new Date().toISOString()
    };

    if (driverLng && driverLat) {
        update.driver_location = `POINT(${driverLng} ${driverLat})`;
    }
    if (estimatedMinutes !== undefined) {
        update.estimated_minutes = estimatedMinutes;
    }

    const { data, error } = await sb
        .from('delivery_tracking')
        .update(update)
        .eq('delivery_id', deliveryId);

    if (error) console.error('Update tracking error:', error);
    return data;
};

/**
 * Mark driver as offline in Supabase when they go offline.
 */
export const setDriverOffline = async (driverId: string) => {
    const sb = getSupabase();
    if (!sb) return null;

    const { data, error } = await sb
        .from('driver_locations')
        .update({
            is_online: false,
            is_available: false,
            updated_at: new Date().toISOString()
        })
        .eq('driver_id', driverId);

    if (error) console.error('Set driver offline error:', error);
    return data;
};
