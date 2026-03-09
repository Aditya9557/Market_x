import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../services/location_service.dart';
import '../../theme.dart';

class ActiveDeliveryScreen extends ConsumerStatefulWidget {
  const ActiveDeliveryScreen({super.key});

  @override
  ConsumerState<ActiveDeliveryScreen> createState() => _ActiveDeliveryScreenState();
}

class _ActiveDeliveryScreenState extends ConsumerState<ActiveDeliveryScreen> {
  final _api = ApiClient();
  final _locationService = LocationService();
  Map<String, dynamic>? _delivery;
  bool _loading = true;
  bool _updating = false;
  bool _trackingEnabled = false;

  static const _statusFlow = [
    'accepted',
    'picked_up',
    'in_transit',
    'delivered',
  ];

  static const _statusInfo = {
    'accepted': {
      'label': 'Order Accepted',
      'emoji': '✅',
      'desc': 'Head to the shop to pick up the order',
      'action': 'Picked Up',
    },
    'picked_up': {
      'label': 'Picked Up',
      'emoji': '📦',
      'desc': 'Go to the student\'s delivery location',
      'action': 'Start Delivery',
    },
    'in_transit': {
      'label': 'In Transit',
      'emoji': '🚀',
      'desc': 'Delivering to the student',
      'action': 'Mark Delivered',
    },
    'delivered': {
      'label': 'Delivered',
      'emoji': '🎉',
      'desc': 'Great job, Hero!',
      'action': null,
    },
  };

  @override
  void initState() {
    super.initState();
    _fetchDelivery();
  }

  @override
  void dispose() {
    if (_trackingEnabled) {
      _locationService.stopTracking();
    }
    super.dispose();
  }

  Future<void> _fetchDelivery() async {
    setState(() => _loading = true);
    try {
      final delivery = await _api.getActiveDelivery();
      setState(() => _delivery = delivery);
    } catch (e) {
      debugPrint('Error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _advanceStatus() async {
    if (_delivery == null) return;
    final currentStatus = _delivery!['status'] as String? ?? 'accepted';
    final currentIdx = _statusFlow.indexOf(currentStatus);
    if (currentIdx >= _statusFlow.length - 1) return;

    final nextStatus = _statusFlow[currentIdx + 1];
    final deliveryId = _delivery!['_id'] ?? '';

    setState(() => _updating = true);
    try {
      await _api.updateDeliveryStatus(deliveryId, nextStatus);

      // Stop tracking on delivered
      if (nextStatus == 'delivered' && _trackingEnabled) {
        await _locationService.stopTracking();
        setState(() => _trackingEnabled = false);
      }

      await _fetchDelivery();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to update status'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      setState(() => _updating = false);
    }
  }

  Future<void> _toggleTracking() async {
    if (_delivery == null) return;
    final deliveryId = _delivery!['_id'] ?? '';

    if (_trackingEnabled) {
      await _locationService.stopTracking();
      setState(() => _trackingEnabled = false);
    } else {
      await _locationService.startTracking(deliveryId, 'token');
      setState(() => _trackingEnabled = true);
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

    return _buildDeliveryView();
  }

  Widget _buildNoDelivery() {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('🏃', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 20),
              const Text(
                'No active delivery',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Accept an order to start delivering',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
              ),
              const SizedBox(height: 32),
              GestureDetector(
                onTap: () => context.go('/hero/orders'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [primaryGreen, Color(0xFF059669)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: primaryGreen.withValues(alpha: 0.35),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Text(
                    '📋 View Available Orders',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ).animate().fadeIn(duration: 600.ms),
      ),
    );
  }

  Widget _buildDeliveryView() {
    final status = _delivery!['status'] as String? ?? 'accepted';
    final currentIdx = _statusFlow.indexOf(status);
    final currentInfo = _statusInfo[status] ?? _statusInfo['accepted']!;
    final orderNumber = _delivery!['order']?['orderNumber'] ?? '—';
    final total = (_delivery!['order']?['total'] ?? 0).toDouble();
    final storeName = _delivery!['order']?['store']?['name'] ?? 'Campus Shop';
    final deliveryAddress = _delivery!['order']?['deliveryAddress'] ?? 'Campus';
    final studentName = _delivery!['order']?['user']?['name'] ?? 'Student';
    final isDelivered = status == 'delivered';

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchDelivery,
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
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isDelivered ? 'Delivered! 🎉' : 'Active Delivery',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                      Text(
                        '#$orderNumber',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade500,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ],
              ).animate().fadeIn(duration: 500.ms),

              const SizedBox(height: 24),

              // ─── Status Card ───
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      primaryGreen.withValues(alpha: 0.08),
                      primaryGreen.withValues(alpha: 0.02),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: primaryGreen.withValues(alpha: 0.2)),
                ),
                child: Column(
                  children: [
                    Text(
                      currentInfo['emoji']!,
                      style: const TextStyle(fontSize: 48),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      currentInfo['label']!,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      currentInfo['desc']!,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade400,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 100.ms).scale(begin: const Offset(0.95, 0.95)),

              const SizedBox(height: 16),

              // ─── Progress ───
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
                      'Delivery Progress',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: _statusFlow.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final isActive = idx <= currentIdx;
                        final isCurrent = idx == currentIdx;
                        final info = _statusInfo[entry.value]!;
                        final isLast = idx == _statusFlow.length - 1;

                        return Expanded(
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isCurrent
                                      ? primaryGreen
                                      : isActive
                                          ? primaryGreen.withValues(alpha: 0.3)
                                          : Colors.white.withValues(alpha: 0.06),
                                  boxShadow: isCurrent
                                      ? [
                                          BoxShadow(
                                            color: primaryGreen.withValues(alpha: 0.4),
                                            blurRadius: 10,
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Center(
                                  child: Text(
                                    info['emoji']!,
                                    style: const TextStyle(fontSize: 14),
                                  ),
                                ),
                              ),
                              if (!isLast)
                                Expanded(
                                  child: Container(
                                    height: 2,
                                    color: isActive && idx < currentIdx
                                        ? primaryGreen.withValues(alpha: 0.4)
                                        : Colors.white.withValues(alpha: 0.06),
                                  ),
                                ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 200.ms),

              const SizedBox(height: 16),

              // ─── Delivery Details ───
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
                    const SizedBox(height: 14),
                    _buildInfoRow('🏪', 'Pickup', storeName),
                    _buildInfoRow('📍', 'Deliver To', deliveryAddress),
                    _buildInfoRow('👤', 'Customer', studentName),
                    _buildInfoRow('💰', 'Order Value', '₹${total.toStringAsFixed(0)}'),
                  ],
                ),
              ).animate().fadeIn(delay: 300.ms),

              const SizedBox(height: 16),

              // ─── Live Tracking Toggle ───
              if (!isDelivered)
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: surfaceDark,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.grey.shade800),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: _trackingEnabled
                                  ? primaryGreen.withValues(alpha: 0.12)
                                  : Colors.white.withValues(alpha: 0.04),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Center(
                              child: Text('📡', style: TextStyle(fontSize: 22)),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Live Location',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                _trackingEnabled
                                    ? 'Sharing with student'
                                    : 'Enable to share location',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Switch(
                        value: _trackingEnabled,
                        onChanged: (_) => _toggleTracking(),
                        activeThumbColor: primaryGreen,
                        activeTrackColor: primaryGreen.withValues(alpha: 0.3),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 350.ms),

              const SizedBox(height: 24),

              // ─── Action Button ───
              if (!isDelivered && currentInfo['action'] != null)
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
                          color: primaryGreen.withValues(alpha: 0.35),
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
                              '${currentInfo['action']} →',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),

              if (isDelivered) ...[
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () => context.go('/hero'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryGreen,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      '← Back to Dashboard',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
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

  Widget _buildInfoRow(String emoji, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 10),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade500,
            ),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
