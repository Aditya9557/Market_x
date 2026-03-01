import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// API client connecting to the Express backend.
/// Handles JWT token management automatically.

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  
  late final Dio dio;
  final _storage = const FlutterSecureStorage();
  
  // Change this to your backend URL
  // For Android emulator: http://10.0.2.2:5001/api
  // For iOS simulator: http://localhost:5001/api
  // For physical device: http://YOUR_IP:5001/api
  static const baseUrl = 'http://192.168.0.106:5001/api';
  
  ApiClient._internal() {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));
    
    // Request interceptor — attach JWT token
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          // Token expired — trigger logout
          _storage.deleteAll();
        }
        return handler.next(error);
      },
    ));
  }
  
  // ─── AUTH ───────────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    final data = response.data;
    await _storage.write(key: 'token', value: data['token']);
    await _storage.write(key: 'user', value: data.toString());
    return data;
  }
  
  Future<Map<String, dynamic>> signup(Map<String, dynamic> userData) async {
    final response = await dio.post('/auth/signup', data: userData);
    final data = response.data;
    await _storage.write(key: 'token', value: data['token']);
    return data;
  }
  
  Future<void> logout() async {
    await _storage.deleteAll();
  }
  
  // ─── PRODUCTS ───────────────────────────────────────────
  Future<List<dynamic>> getProducts({String? search, String? category, int page = 1}) async {
    final response = await dio.get('/products', queryParameters: {
      if (search != null) 'search': search,
      if (category != null) 'category': category,
      'page': page,
    });
    return response.data['products'] ?? response.data;
  }
  
  // ─── CART ───────────────────────────────────────────────
  Future<Map<String, dynamic>> getCart() async {
    final response = await dio.get('/cart');
    return response.data;
  }
  
  Future<void> addToCart(String productId, int quantity) async {
    await dio.post('/cart/add', data: {
      'productId': productId,
      'quantity': quantity,
    });
  }
  
  // ─── ORDERS ─────────────────────────────────────────────
  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> orderData) async {
    final response = await dio.post('/orders', data: orderData);
    return response.data;
  }
  
  Future<List<dynamic>> getMyOrders() async {
    final response = await dio.get('/orders/my');
    return response.data;
  }
  
  // ─── HERO ───────────────────────────────────────────────
  Future<Map<String, dynamic>> getHeroStatus() async {
    final response = await dio.get('/hero/status');
    return response.data;
  }
  
  Future<Map<String, dynamic>> registerAsHero(String vehicleType) async {
    final response = await dio.post('/hero/register', data: {
      'vehicleType': vehicleType,
    });
    return response.data;
  }
  
  Future<Map<String, dynamic>> toggleHeroOnline() async {
    final response = await dio.post('/hero/toggle');
    return response.data;
  }
  
  Future<List<dynamic>> getAvailableOrders() async {
    final response = await dio.get('/hero/available-orders');
    return response.data;
  }
  
  Future<Map<String, dynamic>> acceptDelivery(String orderId) async {
    final response = await dio.post('/hero/accept/$orderId');
    return response.data;
  }
  
  Future<Map<String, dynamic>?> getActiveDelivery() async {
    final response = await dio.get('/hero/active-delivery');
    return response.data;
  }
  
  Future<Map<String, dynamic>> updateDeliveryStatus(String deliveryId, String status) async {
    final response = await dio.put('/hero/delivery/$deliveryId/status', data: {
      'status': status,
    });
    return response.data;
  }
  
  Future<void> updateLocation(double lng, double lat) async {
    await dio.post('/hero/location', data: {
      'lng': lng,
      'lat': lat,
    });
  }
  
  Future<Map<String, dynamic>> getHeroEarnings() async {
    final response = await dio.get('/hero/earnings');
    return response.data;
  }
}
