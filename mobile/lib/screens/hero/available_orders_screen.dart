import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';

class AvailableOrdersScreen extends ConsumerStatefulWidget {
  const AvailableOrdersScreen({super.key});

  @override
  ConsumerState<AvailableOrdersScreen> createState() => _AvailableOrdersScreenState();
}

class _AvailableOrdersScreenState extends ConsumerState<AvailableOrdersScreen> {
  final _api = ApiClient();
  List<dynamic> _orders = [];
  bool _loading = true;
  String? _acceptingId;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() => _loading = true);
    try {
      final orders = await _api.getAvailableOrders();
      setState(() => _orders = orders);
    } catch (e) {
      debugPrint('Error fetching orders: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _acceptOrder(String orderId) async {
    setState(() => _acceptingId = orderId);
    try {
      await _api.acceptDelivery(orderId);
      if (mounted) context.go('/hero/active');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to accept order'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _acceptingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchOrders,
          color: primaryGreen,
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: primaryGreen))
              : ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    // ─── Header ───
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Available Orders',
                                style: TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _orders.isNotEmpty
                                    ? '${_orders.length} order${_orders.length != 1 ? 's' : ''} waiting for a hero'
                                    : 'No orders right now — check back soon',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        _buildRefreshButton(),
                      ],
                    ).animate().fadeIn(duration: 500.ms),

                    const SizedBox(height: 24),

                    // ─── Orders List or Empty State ───
                    if (_orders.isEmpty)
                      _buildEmptyState()
                    else
                      ..._orders.asMap().entries.map((entry) {
                        final order = entry.value as Map<String, dynamic>;
                        return _buildOrderCard(order, entry.key);
                      }),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildRefreshButton() {
    return GestureDetector(
      onTap: _fetchOrders,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🔄', style: TextStyle(fontSize: 14)),
            const SizedBox(width: 6),
            Text(
              'Refresh',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade400,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 60),
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFFF6B57).withOpacity(0.08),
              border: Border.all(
                color: const Color(0xFFFF6B57).withOpacity(0.15),
              ),
            ),
            child: const Center(
              child: Text('🎧', style: TextStyle(fontSize: 36)),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'No orders right now',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Stay online — new orders appear here\nas they come in!',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade500,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 28),
          GestureDetector(
            onTap: _fetchOrders,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
                color: Colors.white.withOpacity(0.04),
              ),
              child: const Text(
                '🔄 Refresh',
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
    ).animate().fadeIn(duration: 600.ms).scale(begin: const Offset(0.95, 0.95));
  }

  Widget _buildOrderCard(Map<String, dynamic> order, int index) {
    final isReady = order['status'] == 'ready';
    final orderNumber = order['orderNumber'] ?? '—';
    final address = order['deliveryAddress'] ?? 'Campus address';
    final userName = order['user']?['name'] ?? 'Student';
    final storeName = order['store']?['name'] ?? 'Store';
    final total = (order['total'] ?? 0).toDouble();

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: surfaceDark,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isReady
                ? const Color(0xFF0F9D58).withOpacity(0.3)
                : Colors.grey.shade800,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order number + status
            Row(
              children: [
                // Icon
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    color: isReady
                        ? const Color(0xFF0F9D58).withOpacity(0.12)
                        : const Color(0xFFFF6B57).withOpacity(0.08),
                    border: Border.all(
                      color: isReady
                          ? const Color(0xFF0F9D58).withOpacity(0.3)
                          : const Color(0xFFFF6B57).withOpacity(0.15),
                    ),
                  ),
                  child: Center(
                    child: Text(
                      isReady ? '✅' : '📦',
                      style: const TextStyle(fontSize: 22),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            '#$orderNumber',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'monospace',
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20),
                              color: isReady
                                  ? const Color(0xFF0F9D58).withOpacity(0.1)
                                  : const Color(0xFFFFCC00).withOpacity(0.1),
                              border: Border.all(
                                color: isReady
                                    ? const Color(0xFF0F9D58).withOpacity(0.3)
                                    : const Color(0xFFFFCC00).withOpacity(0.25),
                              ),
                            ),
                            child: Text(
                              isReady ? '✅ Ready' : '⏳ ${order['status'] ?? 'pending'}',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: isReady
                                    ? const Color(0xFF0F9D58)
                                    : const Color(0xFFFFCC00),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '📍 $address',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade400,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Customer & Store
            Row(
              children: [
                Text(
                  '👤 ',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
                Text(
                  userName,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '•',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
                const SizedBox(width: 12),
                Text(
                  '🏪 ',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
                Expanded(
                  child: Text(
                    storeName,
                    style: const TextStyle(
                      color: Color(0xFFFF6B57),
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Price + Accept Button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      '₹${total.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: primaryGreen,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        color: primaryGreen.withOpacity(0.1),
                        border: Border.all(
                          color: primaryGreen.withOpacity(0.25),
                        ),
                      ),
                      child: const Text(
                        '+ delivery fee',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: primaryGreen,
                        ),
                      ),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: _acceptingId == order['_id']
                      ? null
                      : () => _acceptOrder(order['_id']),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 22,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [primaryGreen, Color(0xFF059669)],
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: primaryGreen.withOpacity(0.3),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: _acceptingId == order['_id']
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            '🦸 Accept',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: (200 + index * 100).ms).slideY(begin: 0.05);
  }
}
