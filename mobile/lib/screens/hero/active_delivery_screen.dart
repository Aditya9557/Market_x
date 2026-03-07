import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';

class ActiveDeliveryScreen extends ConsumerStatefulWidget {
  const ActiveDeliveryScreen({super.key});

  @override
  ConsumerState<ActiveDeliveryScreen> createState() => _ActiveDeliveryScreenState();
}

class _ActiveDeliveryScreenState extends ConsumerState<ActiveDeliveryScreen> {
  final _api = ApiClient();
  Map<String, dynamic>? _delivery;
  bool _loading = true;
  bool _updating = false;
  bool _locationSharing = false;

  static const _statusFlow = ['accepted', 'picked_up', 'in_transit', 'delivered'];
  static const _statusInfo = {
    'accepted': {'label': 'Heading to Store', 'emoji': '🏪', 'next': "I've Picked Up the Order"},
    'picked_up': {'label': 'Order Picked Up', 'emoji': '📦', 'next': 'Start Delivery'},
    'in_transit': {'label': 'On the Way', 'emoji': '🏃', 'next': 'Mark as Delivered ✅'},
    'delivered': {'label': 'Delivered!', 'emoji': '✅', 'next': ''},
  };

  @override
  void initState() {
    super.initState();
    _fetchDelivery();
  }

  Future<void> _fetchDelivery() async {
    setState(() => _loading = true);
    try {
      final data = await _api.getActiveDelivery();
      setState(() => _delivery = data);
    } catch (e) {
      debugPrint('Error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _advanceStatus() async {
    if (_delivery == null) return;
    final currentStatus = _delivery!['status'] as String;
    final nextMap = {
      'accepted': 'picked_up',
      'picked_up': 'in_transit',
      'in_transit': 'delivered',
    };
    final next = nextMap[currentStatus];
    if (next == null) return;

    setState(() => _updating = true);
    try {
      final data = await _api.updateDeliveryStatus(_delivery!['_id'], next);
      setState(() => _delivery = data['delivery'] ?? data);
      if (next == 'delivered') {
        setState(() => _locationSharing = false);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to update status'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: primaryGreen)),
      );
    }

    if (_delivery == null) {
      return _buildNoDelivery();
    }

    return _buildActiveDelivery();
  }

  Widget _buildNoDelivery() {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('🎧', style: TextStyle(fontSize: 64)),
                const SizedBox(height: 20),
                const Text(
                  'No Active Delivery',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Go to Available Orders to pick up a delivery.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade500,
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 52,
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
                      onPressed: () => context.go('/hero/orders'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Browse Orders',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ).animate().fadeIn(duration: 600.ms),
          ),
        ),
      ),
    );
  }

  Widget _buildActiveDelivery() {
    final status = _delivery!['status'] as String? ?? 'accepted';
    final info = _statusInfo[status] ?? _statusInfo['accepted']!;
    final currentIdx = _statusFlow.indexOf(status);

    final order = _delivery!['order'] as Map<String, dynamic>?;
    final customer = _delivery!['customer'] as Map<String, dynamic>?;
    final pickupAddr = _delivery!['pickupAddress'] ?? '—';
    final deliveryAddr = _delivery!['deliveryAddress'] ?? '—';
    final fee = (_delivery!['deliveryFee'] ?? 0).toDouble();
    final tip = (_delivery!['tip'] ?? 0).toDouble();
    final notes = _delivery!['notes'] as String?;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchDelivery,
          color: primaryGreen,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // ─── Title ───
              const Text(
                'Active Delivery',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ).animate().fadeIn(duration: 500.ms),

              const SizedBox(height: 20),

              // ─── Progress Stepper ───
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: surfaceDark,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade800),
                ),
                child: Column(
                  children: [
                    // Steps
                    Row(
                      children: _statusFlow.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final s = entry.value;
                        final sInfo = _statusInfo[s]!;
                        final isActive = idx <= currentIdx;
                        final isCurrent = idx == currentIdx;

                        return Expanded(
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isCurrent
                                      ? const Color(0xFFFF6B57)
                                      : isActive
                                          ? primaryGreen
                                          : Colors.white.withOpacity(0.06),
                                  boxShadow: isCurrent
                                      ? [
                                          BoxShadow(
                                            color: const Color(0xFFFF6B57).withOpacity(0.4),
                                            blurRadius: 16,
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Center(
                                  child: isActive
                                      ? Text(
                                          sInfo['emoji']!,
                                          style: const TextStyle(fontSize: 16),
                                        )
                                      : Text(
                                          '${idx + 1}',
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                ),
                              ),
                              if (idx < _statusFlow.length - 1)
                                Expanded(
                                  child: Container(
                                    height: 3,
                                    margin: const EdgeInsets.symmetric(horizontal: 4),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(2),
                                      color: isActive && currentIdx > idx
                                          ? primaryGreen
                                          : Colors.white.withOpacity(0.06),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 18),

                    // Current Status Label
                    Text(
                      '${info['emoji']} ${info['label']}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Step ${currentIdx + 1} of ${_statusFlow.length}',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 100.ms, duration: 500.ms),

              const SizedBox(height: 16),

              // ─── Delivery Info ───
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: surfaceDark,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade800),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '📋 Delivery Info',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),

                    _buildInfoRow('Order', '#${order?['orderNumber'] ?? '—'}', mono: true),
                    _buildInfoRow('Customer', customer?['name'] ?? '—'),
                    _buildInfoRow('Pickup', '$pickupAddr', isAddress: true),
                    _buildInfoRow('Drop-off', '$deliveryAddr', isAddress: true),

                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Container(height: 1, color: Colors.grey.shade800),
                    ),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Delivery Fee',
                          style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                        ),
                        Text(
                          '₹${fee.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: primaryGreen,
                          ),
                        ),
                      ],
                    ),

                    if (tip > 0) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Tip 🎁',
                            style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                          ),
                          Text(
                            '₹${tip.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFFFFCC00),
                            ),
                          ),
                        ],
                      ),
                    ],

                    if (notes != null && notes.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.03),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade800),
                        ),
                        child: Text(
                          '📝 $notes',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade400,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ).animate().fadeIn(delay: 200.ms, duration: 500.ms),

              const SizedBox(height: 16),

              // ─── Live Tracking Toggle ───
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: surfaceDark,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade800),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '📍 Live Tracking',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _locationSharing
                                ? '🟢 Broadcasting your location'
                                : '🔴 Location sharing is off',
                            style: TextStyle(
                              fontSize: 13,
                              color: _locationSharing
                                  ? primaryGreen
                                  : Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        setState(() => _locationSharing = !_locationSharing);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          color: _locationSharing
                              ? Colors.red.withOpacity(0.08)
                              : primaryGreen.withOpacity(0.12),
                          border: Border.all(
                            color: _locationSharing
                                ? Colors.red.withOpacity(0.3)
                                : primaryGreen.withOpacity(0.3),
                          ),
                        ),
                        child: Text(
                          _locationSharing ? 'Stop' : 'Start',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: _locationSharing ? Colors.red : primaryGreen,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 300.ms, duration: 500.ms),

              const SizedBox(height: 20),

              // ─── Action / Celebration ───
              if (status != 'delivered')
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
                      onPressed: _updating ? null : _advanceStatus,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: _updating
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              '${info['emoji']} ${info['next']}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                ).animate().fadeIn(delay: 400.ms, duration: 500.ms)
              else
                _buildCelebration(fee, tip),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {bool mono = false, bool isAddress = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontSize: 14,
                color: Colors.white,
                fontWeight: FontWeight.w500,
                fontFamily: mono ? 'monospace' : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCelebration(double fee, double tip) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          const Text('🎉', style: TextStyle(fontSize: 64)),
          const SizedBox(height: 16),
          const Text(
            'Delivery Complete!',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: primaryGreen,
            ),
          ),
          const SizedBox(height: 8),
          RichText(
            text: TextSpan(
              text: 'You earned ',
              style: TextStyle(fontSize: 14, color: Colors.grey.shade400),
              children: [
                TextSpan(
                  text: '₹${(fee + tip).toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: primaryGreen,
                  ),
                ),
                const TextSpan(text: ' 💪'),
              ],
            ),
          ),
          const SizedBox(height: 28),
          GestureDetector(
            onTap: () => context.go('/hero'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
                color: Colors.white.withOpacity(0.04),
              ),
              child: const Text(
                'Back to Dashboard',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.white70,
                ),
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms).scale(begin: const Offset(0.9, 0.9));
  }
}
