import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

    if (_earnings == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('💸', style: TextStyle(fontSize: 56)),
              const SizedBox(height: 16),
              const Text(
                'Could not load earnings',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 20),
              GestureDetector(
                onTap: _fetchEarnings,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: const Text(
                    'Retry',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final todayEarnings = (_earnings!['todayEarnings'] ?? 0).toDouble();
    final todayDeliveries = _earnings!['todayDeliveries'] ?? 0;
    final totalEarnings = (_earnings!['totalEarnings'] ?? 0).toDouble();
    final totalDeliveries = _earnings!['totalDeliveries'] ?? 0;
    final rating = (_earnings!['rating'] ?? 0).toDouble();
    final avg = totalDeliveries > 0 ? (totalEarnings / totalDeliveries) : 0.0;
    final recentDeliveries = _earnings!['recentDeliveries'] as List? ?? [];

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchEarnings,
          color: primaryGreen,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // ─── Header ───
              const Text(
                'Earnings 💰',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ).animate().fadeIn(duration: 500.ms),
              const SizedBox(height: 4),
              Text(
                'Your delivery income overview',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
              ).animate().fadeIn(delay: 100.ms),

              const SizedBox(height: 24),

              // ─── Stat Cards ───
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: [
                  _buildStatCard(
                    icon: '💚',
                    label: "Today's Earnings",
                    value: '₹${todayEarnings.toStringAsFixed(0)}',
                    sub: '$todayDeliveries deliveries',
                    color: primaryGreen,
                    delay: 0,
                  ),
                  _buildStatCard(
                    icon: '🏆',
                    label: 'All Time',
                    value: '₹${totalEarnings.toStringAsFixed(0)}',
                    sub: '$totalDeliveries deliveries',
                    color: const Color(0xFFFF6B57),
                    delay: 100,
                  ),
                  _buildStatCard(
                    icon: '⚡',
                    label: 'Avg per Delivery',
                    value: '₹${avg.toStringAsFixed(0)}',
                    sub: 'per order',
                    color: const Color(0xFFFFCC00),
                    delay: 200,
                  ),
                  _buildStatCard(
                    icon: '⭐',
                    label: 'Rating',
                    value: rating > 0 ? '${rating.toStringAsFixed(1)}★' : '—',
                    sub: 'from customers',
                    color: primaryPurple,
                    delay: 300,
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // ─── Instant Payout Banner ───
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: primaryGreen.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: primaryGreen.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '⚡ Instant Payout',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Cash out your earnings to your debit card instantly',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade400,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: primaryGreen.withOpacity(0.1),
                        border: Border.all(
                          color: primaryGreen.withOpacity(0.25),
                        ),
                      ),
                      child: Opacity(
                        opacity: 0.6,
                        child: Text(
                          'Coming Soon',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: primaryGreen,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 400.ms, duration: 500.ms),

              const SizedBox(height: 24),

              // ─── Delivery History ───
              const Text(
                'Delivery History',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ).animate().fadeIn(delay: 450.ms),
              const SizedBox(height: 12),

              if (recentDeliveries.isEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  decoration: BoxDecoration(
                    color: surfaceDark,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.grey.shade800),
                  ),
                  child: Column(
                    children: [
                      const Text('📭', style: TextStyle(fontSize: 40)),
                      const SizedBox(height: 12),
                      const Text(
                        'No deliveries yet',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Accept your first order to start earning!',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 500.ms)
              else
                Container(
                  decoration: BoxDecoration(
                    color: surfaceDark,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.grey.shade800),
                  ),
                  child: Column(
                    children: [
                      // Table header
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.03),
                          border: Border(
                            bottom: BorderSide(color: Colors.grey.shade800),
                          ),
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(18),
                            topRight: Radius.circular(18),
                          ),
                        ),
                        child: Row(
                          children: ['Order', 'Store', 'Total', 'Date']
                              .map(
                                (h) => Expanded(
                                  child: Text(
                                    h,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 1,
                                      color: Colors.grey.shade500,
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                      // Rows
                      ...recentDeliveries.asMap().entries.map((entry) {
                        final d = entry.value as Map<String, dynamic>;
                        final isLast = entry.key == recentDeliveries.length - 1;
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 14,
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
                              Expanded(
                                child: Text(
                                  '#${d['orderNumber'] ?? '—'}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  '${d['store'] ?? '—'}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade400,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  '₹${(d['total'] ?? 0).toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: primaryGreen,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  d['deliveredAt'] != null
                                      ? _formatDate(d['deliveredAt'])
                                      : '—',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ).animate().fadeIn(delay: (500 + entry.key * 60).ms);
                      }),
                    ],
                  ),
                ).animate().fadeIn(delay: 500.ms),

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
    required String sub,
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
          Row(
            children: [
              Text(icon, style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade500,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: color,
                ),
              ),
              Text(
                sub,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey.shade600,
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
