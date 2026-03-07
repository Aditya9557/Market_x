import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

class HeroDashboardScreen extends ConsumerStatefulWidget {
  const HeroDashboardScreen({super.key});

  @override
  ConsumerState<HeroDashboardScreen> createState() => _HeroDashboardScreenState();
}

class _HeroDashboardScreenState extends ConsumerState<HeroDashboardScreen> {
  final _api = ApiClient();
  Map<String, dynamic>? _heroStatus;
  Map<String, dynamic>? _earnings;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _loading = true);
    try {
      final status = await _api.getHeroStatus();
      setState(() => _heroStatus = status);
      if (status['isHero'] == true) {
        final earnings = await _api.getHeroEarnings();
        setState(() => _earnings = earnings);
      }
    } catch (e) {
      setState(() => _error = 'Failed to load dashboard');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _registerAsHero() async {
    try {
      await _api.registerAsHero('bicycle');
      await _fetchData();
    } catch (e) {
      setState(() => _error = 'Failed to register as hero');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: primaryGreen),
        ),
      );
    }

    // If not a hero, show onboarding
    if (_heroStatus == null || _heroStatus!['isHero'] != true) {
      return _buildOnboarding();
    }

    return _buildDashboard();
  }

  Widget _buildOnboarding() {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Hero Icon
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [primaryGreen, Color(0xFF059669)],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: primaryGreen.withOpacity(0.3),
                      blurRadius: 40,
                      spreadRadius: 4,
                    ),
                  ],
                ),
                child: const Center(
                  child: Text('🦸', style: TextStyle(fontSize: 50)),
                ),
              ).animate().fadeIn(duration: 600.ms).scale(begin: const Offset(0.8, 0.8)),

              const SizedBox(height: 32),

              const Text(
                'Become a Hero',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ).animate().fadeIn(delay: 200.ms),

              const SizedBox(height: 12),

              Text(
                'Earn by helping classmates with deliveries — flexible hours, great pay!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  color: Colors.grey.shade400,
                  height: 1.5,
                ),
              ).animate().fadeIn(delay: 300.ms),

              const SizedBox(height: 40),

              // Features
              ...[
                {'icon': '💰', 'title': 'Earn Money', 'desc': 'Get paid for every delivery'},
                {'icon': '⏰', 'title': 'Flexible Hours', 'desc': 'Work when you want'},
                {'icon': '🏃', 'title': 'Stay Active', 'desc': 'Explore your campus'},
              ].asMap().entries.map((entry) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: primaryGreen.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: primaryGreen.withOpacity(0.12),
                        ),
                      ),
                      child: Row(
                        children: [
                          Text(
                            entry.value['icon']!,
                            style: const TextStyle(fontSize: 28),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  entry.value['title']!,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  entry.value['desc']!,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: (400 + entry.key * 100).ms).slideX(begin: -0.1),
                  )),

              const SizedBox(height: 32),

              // Apply Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [primaryGreen, Color(0xFF059669)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: primaryGreen.withOpacity(0.35),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: _registerAsHero,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '🦸 Apply Now',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward, color: Colors.white, size: 20),
                      ],
                    ),
                  ),
                ),
              ).animate().fadeIn(delay: 700.ms).slideY(begin: 0.1),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDashboard() {
    final todayEarnings = (_earnings?['todayEarnings'] ?? 0).toDouble();
    final todayDeliveries = _earnings?['todayDeliveries'] ?? 0;
    final totalEarnings = (_earnings?['totalEarnings'] ?? 0).toDouble();
    final rating = (_heroStatus?['rating'] ?? 5.0).toDouble();
    final recentDeliveries = _earnings?['recentDeliveries'] as List? ?? [];

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchData,
          color: primaryGreen,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // ─── Header ───
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Hero Dashboard',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Welcome back, Hero! 🦸',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade400,
                        ),
                      ),
                    ],
                  ),
                  // Logout
                  GestureDetector(
                    onTap: () async {
                      await ref.read(authProvider.notifier).logout();
                      if (mounted) context.go('/login');
                    },
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: const Icon(Icons.logout, color: Colors.white54, size: 20),
                    ),
                  ),
                ],
              ).animate().fadeIn(duration: 500.ms),

              const SizedBox(height: 24),

              // ─── Stats Grid ───
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.5,
                children: [
                  _buildStatCard(
                    icon: '💰',
                    label: "Today's Earnings",
                    value: '₹${todayEarnings.toStringAsFixed(0)}',
                    color: primaryGreen,
                    delay: 0,
                  ),
                  _buildStatCard(
                    icon: '📦',
                    label: "Today's Deliveries",
                    value: '$todayDeliveries',
                    color: const Color(0xFFFF6B57),
                    delay: 100,
                  ),
                  _buildStatCard(
                    icon: '🏦',
                    label: 'Total Earnings',
                    value: '₹${totalEarnings.toStringAsFixed(0)}',
                    color: primaryPurple,
                    delay: 200,
                  ),
                  _buildStatCard(
                    icon: '⭐',
                    label: 'Rating',
                    value: '${rating.toStringAsFixed(1)}★',
                    color: const Color(0xFFFFCC00),
                    delay: 300,
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // ─── Quick Actions ───
              const Text(
                'Quick Actions',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ).animate().fadeIn(delay: 400.ms),
              const SizedBox(height: 12),

              ...[
                {
                  'route': '/hero/orders',
                  'icon': '📋',
                  'label': 'Available Orders',
                  'desc': 'Find orders to deliver',
                  'color': const Color(0xFFFF6B57),
                },
                {
                  'route': '/hero/active',
                  'icon': '🏃',
                  'label': 'Active Delivery',
                  'desc': 'Manage current delivery',
                  'color': primaryGreen,
                },
                {
                  'route': '/hero/earnings',
                  'icon': '💸',
                  'label': 'Earnings',
                  'desc': 'View detailed breakdown',
                  'color': primaryPurple,
                },
              ].asMap().entries.map((entry) {
                final action = entry.value;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: GestureDetector(
                    onTap: () => context.go(action['route'] as String),
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: surfaceDark,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: Colors.grey.shade800),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: (action['color'] as Color).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Center(
                              child: Text(
                                action['icon'] as String,
                                style: const TextStyle(fontSize: 24),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  action['label'] as String,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  action['desc'] as String,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            Icons.arrow_forward_ios,
                            size: 16,
                            color: action['color'] as Color,
                          ),
                        ],
                      ),
                    ),
                  ),
                ).animate().fadeIn(delay: (450 + entry.key * 100).ms).slideX(begin: 0.05);
              }),

              const SizedBox(height: 24),

              // ─── Recent Deliveries ───
              if (recentDeliveries.isNotEmpty) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Recent Deliveries',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => context.go('/hero/earnings'),
                      child: const Text(
                        'View All →',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: primaryGreen,
                        ),
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 700.ms),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: surfaceDark,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.grey.shade800),
                  ),
                  child: Column(
                    children: recentDeliveries.take(5).map<Widget>((d) {
                      final delivery = d as Map<String, dynamic>;
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: Colors.grey.shade800,
                              width: 0.5,
                            ),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Order #${delivery['orderNumber'] ?? '—'}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${delivery['store'] ?? 'Store'}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade500,
                                  ),
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '+₹${(delivery['total'] ?? 0).toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    color: primaryGreen,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Text(
                                  delivery['deliveredAt'] != null
                                      ? _formatDate(delivery['deliveredAt'])
                                      : '—',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ).animate().fadeIn(delay: 750.ms),
              ],

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required String icon,
    required String label,
    required String value,
    required Color color,
    required int delay,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surfaceDark,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade800),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(icon, style: const TextStyle(fontSize: 24)),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: color,
                ),
              ),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey.shade500,
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(delay: (200 + delay).ms).scale(
          begin: const Offset(0.95, 0.95),
          end: const Offset(1, 1),
        );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${date.day} ${months[date.month - 1]}';
    } catch (_) {
      return '—';
    }
  }
}
