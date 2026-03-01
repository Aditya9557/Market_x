import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';

/// User model
class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String status;
  final String token;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.status,
    required this.token,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'student',
      status: json['status'] ?? 'active',
      token: json['token'] ?? '',
    );
  }
}

/// Auth state
class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;

  AuthState({this.user, this.isLoading = false, this.error});

  AuthState copyWith({User? user, bool? isLoading, String? error}) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Auth notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api = ApiClient();

  AuthNotifier() : super(AuthState());

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _api.login(email, password);
      state = AuthState(user: User.fromJson(data));
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Login failed');
    }
  }

  Future<void> signup(Map<String, dynamic> userData) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _api.signup(userData);
      state = AuthState(user: User.fromJson(data));
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Signup failed');
    }
  }

  Future<void> logout() async {
    await _api.logout();
    state = AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
