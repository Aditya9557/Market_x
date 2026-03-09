import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';

class OrderTrackingScreen extends ConsumerStatefulWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  final _api = ApiClient();
  Map<String, dynamic>? _order;
  bool _loading = true;

  static const _statusFlow = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'picked_up',
    'in_transit',
    'delivered',
  ];

  static const _statusInfo = {
    'pending': {'label': 'Order Placed', 'emoji': '📝', 'desc': 'Waiting for vendor confirmation'},
    'confirmed': {'label': 'Confirmed', 'emoji': '✅', 'desc': 'Vendor accepted your order'},
    'preparing': {'label': 'Preparing', 'emoji': '👨‍🍳', 'desc': 'Your order is being prepared'},
    'ready': {'label': 'Ready for Pickup', 'emoji': '📦', 'desc': 'A hero will pick it up soon'},
    'picked_up': {'label': 'Picked Up', 'emoji': '🏃', 'desc': 'Hero is on the way to you'},
    'in_transit': {'label': 'On the Way', 'emoji': '🚀', 'desc': 'Almost there!'},
    'delivered': {'label': 'Delivered', 'emoji': '🎉', 'desc': 'Enjoy your order!'},
  };

  @override
  void initState() {
    super.initState();
    _fetchOrder();
  }

  Future<void> _fetchOrder() async {
    setState(() => _loading = true);
    try {
      // Fetch from my orders and find the one we need
      final orders = await _api.getMyOrders();
      final found = orders.firstWhere(
        (o) => o['_id'] == widget.orderId,
        orElse: () => null,
      );
      setState(() => _order = found as Map<String, dynamic>?);
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

    if (_order == null) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('📦', style: TextStyle(fontSize: 56)),
                const SizedBox(height: 16),
                const Text(
                  'Order not found',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 24),
                GestureDetector(
                  onTap: () => context.go('/browse'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    child: const Text(
                      'Go Back',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final status = _order!['status'] as String? ?? 'pending';
    final currentIdx = _statusFlow.indexOf(status);
    final currentInfo = _statusInfo[status] ?? _statusInfo['pending']!;
    final orderNumber = _order!['orderNumber'] ?? '—';
    final total = (_order!['total'] ?? 0).toDouble();
    final deliveryAddr = _order!['deliveryAddress'] ?? 'Campus address';
    final items = _order!['items'] as List? ?? [];

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchOrder,
          color: primaryGreen,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // ─── Back + Title ───
              Row(
                children: [
                  GestureDetector(
                    onTap: () => context.go('/browse'),
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
                      const Text(
                        'Track Order',
                        style: TextStyle(
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

              const SizedBox(height: 28),

              // ─── Current Status Card ───
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
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade400,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 100.ms, duration: 500.ms).scale(
                    begin: const Offset(0.95, 0.95),
                  ),

              const SizedBox(height: 20),

              // ─── Progress Timeline ───
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
                      'Order Progress',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ..._statusFlow.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final s = entry.value;
                      final info = _statusInfo[s]!;
                      final isActive = idx <= currentIdx;
                      final isCurrent = idx == currentIdx;
                      final isLast = idx == _statusFlow.length - 1;

                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Line + Dot
                          Column(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
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
                                            blurRadius: 12,
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Center(
                                  child: isActive
                                      ? Text(info['emoji']!, style: const TextStyle(fontSize: 12))
                                      : Text(
                                          '${idx + 1}',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                ),
                              ),
                              if (!isLast)
                                Container(
                                  width: 2,
                                  height: 32,
                                  color: isActive
                                      ? primaryGreen.withValues(alpha: 0.3)
                                      : Colors.white.withValues(alpha: 0.06),
                                ),
                            ],
                          ),
                          const SizedBox(width: 14),
                          // Label
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    info['label']!,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                                      color: isActive ? Colors.white : Colors.grey.shade600,
                                    ),
                                  ),
                                  if (isCurrent)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        info['desc']!,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade500,
                                        ),
                                      ),
                                    ),
                                  if (!isLast) const SizedBox(height: 14),
                                ],
                              ),
                            ),
                          ),
                        ],
                      );
                    }),
                  ],
                ),
              ).animate().fadeIn(delay: 200.ms, duration: 500.ms),

              const SizedBox(height: 16),

              // ─── Order Details ───
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
                      '📋 Order Details',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 14),
                    _buildDetailRow('Delivery To', '📍 $deliveryAddr'),
                    _buildDetailRow('Items', '${items.length} item${items.length != 1 ? 's' : ''}'),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Container(height: 1, color: Colors.grey.shade800),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          '₹${total.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: primaryGreen,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 300.ms, duration: 500.ms),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
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
              style: const TextStyle(
                fontSize: 14,
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
