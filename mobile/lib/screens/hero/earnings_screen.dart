import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';

class EarningsScreen extends ConsumerStatefulWidget {
  const EarningsScreen({super.key});

  @override
  ConsumerState<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends ConsumerState<EarningsScreen> {
  final _api = ApiClient();
  Map<String, dynamic>? _earnings;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchEarnings();
  }

  Future<void> _fetchEarnings() async {
    setState(() => _loading = true);
    try {
      final data = await _api.getHeroEarnings();
      setState(() => _earnings = data);
    } catch (e) {
      debugPrint('Error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: primaryGreen)),
      );
    }

    final todayEarnings = (_earnings?['todayEarnings'] ?? 0).toDouble();
    final totalEarnings = (_earnings?['totalEarnings'] ?? 0).toDouble();
    final totalDeliveries = _earnings?['totalDeliveries'] ?? 0;
    final avgEarnings = (_earnings?['averagePerDelivery'] ?? 0).toDouble();
    final rating = (_earnings?['rating'] ?? 5.0).toDouble();
    final recentDeliveries = _earnings?['recentDeliveries'] as List? ?? [];

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchEarnings,
          color: primaryGreen,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // ─── Header ───
              Row(
                children: [
                  GestureDetector(
                    onTap: () => context.go('/hero'),
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                      ),
                      child: const Icon(Icons.arrow_back,
                          color: Colors.white70, size: 20),
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Earnings 💰',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                      Text(
                        'Track your delivery earnings',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ).animate().fadeIn(duration: 500.ms),

              const SizedBox(height: 24),

              // ─── Earnings Hero Card ───
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      primaryGreen.withValues(alpha: 0.15),
                      primaryGreen.withValues(alpha: 0.05),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: primaryGreen.withValues(alpha: 0.25)),
                ),
                child: Column(
                  children: [
                    Text(
                      "Today's Earnings",
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade400,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '₹${todayEarnings.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.w900,
                        color: primaryGreen,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                      decoration: BoxDecoration(
                        color: primaryGreen.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '⭐ ${rating.toStringAsFixed(1)} rating',
                        style: const TextStyle(
                          color: primaryGreen,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 100.ms).scale(begin: const Offset(0.95, 0.95)),

              const SizedBox(height: 16),

              // ─── Stats Row ───
              Row(
                children: [
                  Expanded(
                    child: _buildStatTile(
                      '💰',
                      'Total',
                      '₹${totalEarnings.toStringAsFixed(0)}',
                      primaryGreen,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatTile(
                      '📦',
                      'Deliveries',
                      '$totalDeliveries',
                      const Color(0xFFFF6B57),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatTile(
                      '📊',
                      'Avg/Delivery',
                      '₹${avgEarnings.toStringAsFixed(0)}',
                      primaryPurple,
                    ),
                  ),
                ],
              ).animate().fadeIn(delay: 200.ms),

              const SizedBox(height: 24),

              // ─── Delivery History ───
              const Text(
                'Delivery History',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ).animate().fadeIn(delay: 300.ms),
              const SizedBox(height: 12),

              if (recentDeliveries.isEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: surfaceDark,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.grey.shade800),
                  ),
                  child: Column(
                    children: [
                      const Text('📭', style: TextStyle(fontSize: 40)),
                      const SizedBox(height: 12),
                      Text(
                        'No deliveries yet',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade400,
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 400.ms),
              ] else ...[
                Container(
                  decoration: BoxDecoration(
                    color: surfaceDark,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.grey.shade800),
                  ),
                  child: Column(
                    children: recentDeliveries.asMap().entries.map<Widget>((entry) {
                      final delivery = entry.value as Map<String, dynamic>;
                      final isLast = entry.key == recentDeliveries.length - 1;

                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 16,
                        ),
                        decoration: BoxDecoration(
                          border: isLast
                              ? null
                              : Border(
                                  bottom: BorderSide(
                                    color: Colors.grey.shade800,
                                    width: 0.5,
                                  ),
                                ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: primaryGreen.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Center(
                                child: Text('📦', style: TextStyle(fontSize: 20)),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
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
                                    delivery['deliveredAt'] != null
                                        ? _formatDate(delivery['deliveredAt'])
                                        : 'Recently',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '+₹${(delivery['total'] ?? 0).toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    color: primaryGreen,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: primaryGreen.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'Delivered',
                                    style: TextStyle(
                                      color: primaryGreen,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ).animate().fadeIn(delay: 400.ms),
              ],

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatTile(String icon, String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: surfaceDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade800),
      ),
      child: Column(
        children: [
          Text(icon, style: const TextStyle(fontSize: 20)),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
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
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      return '${date.day} ${months[date.month - 1]}';
    } catch (_) {
      return '—';
    }
  }
}
