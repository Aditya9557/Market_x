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
      debugPrint('Error: $e');
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
          ),
        );
      }
    } finally {
      setState(() => _acceptingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchOrders,
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
                      child: const Icon(Icons.arrow_back, color: Colors.white70, size: 20),
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Available Orders',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                      Text(
                        'Pick one to deliver 🏃',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ).animate().fadeIn(duration: 500.ms),

              const SizedBox(height: 20),

              if (_loading) ...[
                const Center(
                  child: Padding(
                    padding: EdgeInsets.only(top: 80),
                    child: CircularProgressIndicator(color: primaryGreen),
                  ),
                ),
              ] else if (_orders.isEmpty) ...[
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 80),
                    child: Column(
                      children: [
                        const Text('📭', style: TextStyle(fontSize: 56)),
                        const SizedBox(height: 16),
                        const Text(
                          'No orders available',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Check back in a few minutes',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ).animate().fadeIn(duration: 600.ms),
              ] else ...[
                // ─── Orders List ───
                ..._orders.asMap().entries.map((entry) {
                  final order = entry.value as Map<String, dynamic>;
                  final orderId = order['_id'] ?? '';
                  final orderNumber = order['orderNumber'] ?? '—';
                  final total = (order['total'] ?? 0).toDouble();
                  final items = order['items'] as List? ?? [];
                  final storeName = order['store']?['name'] ?? 'Campus Shop';
                  final deliveryAddress = order['deliveryAddress'] ?? 'Campus';

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: surfaceDark,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: Colors.grey.shade800),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Top Row - Order ID + Total
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '#$orderNumber',
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  fontFamily: 'monospace',
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: primaryGreen.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: primaryGreen.withValues(alpha: 0.3),
                                  ),
                                ),
                                child: Text(
                                  '₹${total.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    color: primaryGreen,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 14),

                          // Details
                          Row(
                            children: [
                              const Text('🏪', style: TextStyle(fontSize: 14)),
                              const SizedBox(width: 6),
                              Text(
                                'From: $storeName',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade400,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Text('📍', style: TextStyle(fontSize: 14)),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'To: $deliveryAddress',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade400,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Text('📦', style: TextStyle(fontSize: 14)),
                              const SizedBox(width: 6),
                              Text(
                                '${items.length} item${items.length != 1 ? 's' : ''}',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade400,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 18),

                          // Accept Button
                          SizedBox(
                            width: double.infinity,
                            height: 48,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [primaryGreen, Color(0xFF059669)],
                                ),
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: primaryGreen.withValues(alpha: 0.3),
                                    blurRadius: 16,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: ElevatedButton(
                                onPressed: _acceptingId != null
                                    ? null
                                    : () => _acceptOrder(orderId),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.transparent,
                                  shadowColor: Colors.transparent,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                ),
                                child: _acceptingId == orderId
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            '🦸 Accept Delivery',
                                            style: TextStyle(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ).animate().fadeIn(delay: (200 + entry.key * 100).ms).slideX(begin: 0.05);
                }),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
