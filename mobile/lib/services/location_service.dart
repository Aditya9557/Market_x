import 'dart:async';
import 'package:flutter_background_geolocation/flutter_background_geolocation.dart' as bg;
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../services/api_client.dart';

/// Location Service for Student Hero delivery tracking.
///
/// Uses flutter_background_geolocation for battery-efficient tracking:
/// - Motion detection (still/walking/driving)
/// - Elastic tracking (GPS off when stationary)
/// - Headless mode (works even when app is killed)
/// - Throttled updates (every 5 seconds or 20 meters)
///
/// Sends location updates via:
/// 1. Socket.io (primary — low latency)
/// 2. HTTP POST fallback (if socket disconnects)

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();
  
  io.Socket? _socket;
  String? _deliveryId;
  String? _token;
  bool _isTracking = false;
  
  /// Initialize the background geolocation engine.
  Future<void> initialize() async {
    await bg.BackgroundGeolocation.ready(bg.Config(
      // ─── TRACKING BEHAVIOR ────────
      desiredAccuracy: bg.Config.DESIRED_ACCURACY_HIGH,
      distanceFilter: 20.0,        // Minimum distance (meters) before update
      stopOnTerminate: false,       // Keep tracking when app terminated
      startOnBoot: false,           // Don't auto-start on device boot
      enableHeadless: true,         // Run in headless mode (background isolate)
      
      // ─── BATTERY OPTIMIZATION ─────
      stopTimeout: 5,               // Minutes of stillness before GPS powers down
      isMoving: false,              // Start in stationary state
      
      // ─── ACTIVITY RECOGNITION ─────
      activityRecognitionInterval: 10000, // Check motion every 10 seconds
      stopDetectionDelay: 1,              // Delay stop detection by 1 minute
      
      // ─── LOGGING ──────────────────
      debug: false,
      logLevel: bg.Config.LOG_LEVEL_WARNING,
    ));
  }
  
  /// Connect Socket.io for real-time location broadcasting.
  void connectSocket(String token) {
    _token = token;
    _socket = io.io(
      'http://localhost:5001',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .build(),
    );
    
    _socket!.onConnect((_) {
      print('🔌 Socket connected for location tracking');
    });
    
    _socket!.onDisconnect((_) {
      print('🔌 Socket disconnected');
    });
  }
  
  /// Start tracking and broadcasting location for a delivery.
  Future<void> startTracking(String deliveryId) async {
    if (_isTracking) return;
    _deliveryId = deliveryId;
    _isTracking = true;
    
    // Listen to location updates
    bg.BackgroundGeolocation.onLocation((bg.Location location) {
      _onLocationUpdate(location);
    });
    
    // Listen to motion changes (for battery optimization awareness)
    bg.BackgroundGeolocation.onMotionChange((bg.Location location) {
      print('🏃 Motion change: isMoving=${location.isMoving}');
    });
    
    // Listen to activity changes (still, walking, in_vehicle, etc.)
    bg.BackgroundGeolocation.onActivityChange((bg.ActivityChangeEvent event) {
      print('🎯 Activity: ${event.activity} (${event.confidence}%)');
    });
    
    // Start the location engine
    await bg.BackgroundGeolocation.start();
    await bg.BackgroundGeolocation.changePace(true); // Force into moving state
    
    print('📍 Location tracking started for delivery: $deliveryId');
  }
  
  /// Stop tracking and clean up.
  Future<void> stopTracking() async {
    _isTracking = false;
    _deliveryId = null;
    
    await bg.BackgroundGeolocation.stop();
    print('📍 Location tracking stopped');
  }
  
  /// Handle each location update.
  void _onLocationUpdate(bg.Location location) {
    final lng = location.coords.longitude;
    final lat = location.coords.latitude;
    
    // 1. Broadcast via Socket.io (primary — low latency)
    if (_socket != null && _socket!.connected) {
      _socket!.emit('location:update', {
        'lng': lng,
        'lat': lat,
        'deliveryId': _deliveryId,
      });
    }
    
    // 2. HTTP fallback
    ApiClient().updateLocation(lng, lat).catchError((_) {});
  }
  
  /// Broadcast a delivery status change via Socket.io.
  void broadcastStatusChange(String deliveryId, String status) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('delivery:statusChange', {
        'deliveryId': deliveryId,
        'status': status,
      });
    }
  }
  
  /// Clean up resources.
  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    bg.BackgroundGeolocation.stop();
  }
}

/// Headless task handler — runs when app is terminated.
/// This ensures the hero's location is still transmitted even if
/// the phone screen is off and the app UI is killed.
@pragma('vm:entry-point')
void backgroundGeolocationHeadlessTask(bg.HeadlessEvent headlessEvent) async {
  switch (headlessEvent.name) {
    case bg.Event.LOCATION:
      final location = headlessEvent.event as bg.Location;
      // In headless mode, we use HTTP since Socket may be disconnected
      ApiClient().updateLocation(
        location.coords.longitude,
        location.coords.latitude,
      ).catchError((_) {});
      break;
  }
}
