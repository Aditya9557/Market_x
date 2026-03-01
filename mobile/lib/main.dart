import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'router.dart';
import 'theme.dart';

/// Student Hero Campus Delivery App
///
/// Architecture:
/// - State Management: Riverpod
/// - Navigation: GoRouter with role-based guards
/// - API: Dio → Express backend at localhost:5001
/// - Real-time: Supabase Realtime for driver location tracking
/// - Maps: Mapbox for delivery navigation
/// - Background Location: flutter_background_geolocation for battery efficiency

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase (optional — app works without it via Socket.io fallback)
  try {
    await Supabase.initialize(
      url: const String.fromEnvironment('SUPABASE_URL', defaultValue: ''),
      anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: ''),
    );
  } catch (e) {
    debugPrint('Supabase not configured: $e');
  }

  runApp(
    const ProviderScope(
      child: StudentHeroApp(),
    ),
  );
}

class StudentHeroApp extends ConsumerWidget {
  const StudentHeroApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    
    return MaterialApp.router(
      title: 'Student Hero',
      debugShowCheckedModeBanner: false,
      theme: appTheme,
      darkTheme: appDarkTheme,
      themeMode: ThemeMode.dark,
      routerConfig: router,
    );
  }
}
