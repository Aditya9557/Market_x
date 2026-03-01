import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/student/browse_screen.dart';
import 'screens/student/cart_screen.dart';
import 'screens/student/order_tracking_screen.dart';
import 'screens/hero/hero_dashboard_screen.dart';
import 'screens/hero/available_orders_screen.dart';
import 'screens/hero/active_delivery_screen.dart';
import 'screens/hero/earnings_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  
  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggedIn = authState.user != null;
      final isAuthRoute = state.matchedLocation == '/login' || 
                          state.matchedLocation == '/signup';
      
      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) {
        final role = authState.user!.role;
        switch (role) {
          case 'student': return '/browse';
          case 'hero': return '/hero';
          case 'shopkeeper': return '/browse'; // vendor features on web
          default: return '/browse';
        }
      }
      return null;
    },
    routes: [
      // ─── AUTH ───────────────────────────────
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        builder: (context, state) => const SignupScreen(),
      ),
      
      // ─── STUDENT ────────────────────────────
      ShellRoute(
        builder: (context, state, child) => StudentShell(child: child),
        routes: [
          GoRoute(
            path: '/browse',
            builder: (context, state) => const BrowseScreen(),
          ),
          GoRoute(
            path: '/cart',
            builder: (context, state) => const CartScreen(),
          ),
          GoRoute(
            path: '/tracking/:orderId',
            builder: (context, state) => OrderTrackingScreen(
              orderId: state.pathParameters['orderId']!,
            ),
          ),
        ],
      ),
      
      // ─── HERO ───────────────────────────────
      ShellRoute(
        builder: (context, state, child) => HeroShell(child: child),
        routes: [
          GoRoute(
            path: '/hero',
            builder: (context, state) => const HeroDashboardScreen(),
          ),
          GoRoute(
            path: '/hero/orders',
            builder: (context, state) => const AvailableOrdersScreen(),
          ),
          GoRoute(
            path: '/hero/active',
            builder: (context, state) => const ActiveDeliveryScreen(),
          ),
          GoRoute(
            path: '/hero/earnings',
            builder: (context, state) => const EarningsScreen(),
          ),
        ],
      ),
    ],
  );
});

// ─── SHELL WIDGETS ──────────────────────────────────────────

class StudentShell extends StatelessWidget {
  final Widget child;
  const StudentShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _getIndex(GoRouterState.of(context).matchedLocation),
        onDestinationSelected: (i) {
          switch (i) {
            case 0: context.go('/browse');
            case 1: context.go('/cart');
            case 2: context.go('/hero');
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.store), label: 'Browse'),
          NavigationDestination(icon: Icon(Icons.shopping_cart), label: 'Cart'),
          NavigationDestination(icon: Icon(Icons.delivery_dining), label: 'Hero'),
        ],
      ),
    );
  }

  int _getIndex(String location) {
    if (location.startsWith('/cart')) return 1;
    if (location.startsWith('/hero')) return 2;
    return 0;
  }
}

class HeroShell extends StatelessWidget {
  final Widget child;
  const HeroShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _getIndex(GoRouterState.of(context).matchedLocation),
        onDestinationSelected: (i) {
          switch (i) {
            case 0: context.go('/hero');
            case 1: context.go('/hero/orders');
            case 2: context.go('/hero/active');
            case 3: context.go('/hero/earnings');
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.list_alt), label: 'Orders'),
          NavigationDestination(icon: Icon(Icons.directions_run), label: 'Active'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet), label: 'Earnings'),
        ],
      ),
    );
  }

  int _getIndex(String location) {
    if (location == '/hero/orders') return 1;
    if (location == '/hero/active') return 2;
    if (location == '/hero/earnings') return 3;
    return 0;
  }
}
