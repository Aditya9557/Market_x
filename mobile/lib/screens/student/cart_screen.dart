import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  final _api = ApiClient();
  Map<String, dynamic>? _cart;
  bool _loading = true;
  String? _updatingId;

  static const _catEmoji = {
    'food': '🍔',
    'books': '📚',
    'stationery': '✏️',
    'electronics': '💻',
    'clothing': '👕',
    'services': '⚙️',
    'other': '📦',
  };

  @override
  void initState() {
    super.initState();
    _fetchCart();
  }

  Future<void> _fetchCart() async {
    setState(() => _loading = true);
    try {
      final data = await _api.getCart();
      setState(() => _cart = data);
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

    final items = (_cart?['items'] as List?) ?? [];
    final total = items.fold<double>(0, (sum, item) {
      final price = (item['product']?['price'] ?? 0).toDouble();
      final qty = (item['quantity'] ?? 0).toInt();
      return sum + price * qty;
    });

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchCart,
          color: primaryGreen,
          child: items.isEmpty ? _buildEmptyCart() : _buildCartContent(items, total),
        ),
      ),
    );
  }

  Widget _buildEmptyCart() {
    return ListView(
      children: [
        const SizedBox(height: 100),
        Center(
          child: Column(
            children: [
              const Text('🛒', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 20),
              const Text(
                'Your cart is empty',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Discover products from campus shops',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
              ),
              const SizedBox(height: 32),
              GestureDetector(
                onTap: () => context.go('/browse'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
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
                  child: const Text(
                    'Browse Products',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ).animate().fadeIn(duration: 600.ms),
      ],
    );
  }

  Widget _buildCartContent(List items, double total) {
    // Group by store
    final grouped = <String, List<dynamic>>{};
    final storeNames = <String, String>{};
    for (final item in items) {
      final storeId = item['product']?['store']?['_id'] ?? 'unknown';
      final storeName = item['product']?['store']?['name'] ?? 'Unknown Store';
      grouped.putIfAbsent(storeId, () => []).add(item);
      storeNames[storeId] = storeName;
    }

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // ─── Header ───
        const Text(
          'Your Cart 🛒',
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: Colors.white,
            letterSpacing: -0.5,
          ),
        ).animate().fadeIn(duration: 500.ms),
        const SizedBox(height: 4),
        Text(
          '${items.length} item${items.length != 1 ? 's' : ''} from ${grouped.length} shop${grouped.length != 1 ? 's' : ''}',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
        ).animate().fadeIn(delay: 100.ms),

        const SizedBox(height: 20),

        // ─── Grouped Items ───
        ...grouped.entries.toList().asMap().entries.map((groupEntry) {
          final storeName = storeNames[groupEntry.value.key] ?? 'Store';
          final storeItems = groupEntry.value.value;

          return Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Container(
              decoration: BoxDecoration(
                color: surfaceDark,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.grey.shade800),
              ),
              child: Column(
                children: [
                  // Store Header
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF6B57).withOpacity(0.05),
                      border: Border(
                        bottom: BorderSide(color: Colors.grey.shade800),
                      ),
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(18),
                        topRight: Radius.circular(18),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Text('🏪', style: TextStyle(fontSize: 16)),
                        const SizedBox(width: 8),
                        Text(
                          storeName,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFFF6B57),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Items
                  ...storeItems.asMap().entries.map((itemEntry) {
                    final item = itemEntry.value;
                    final product = item['product'] as Map<String, dynamic>? ?? {};
                    final productId = product['_id'] ?? '';
                    final productName = product['name'] ?? 'Product';
                    final price = (product['price'] ?? 0).toDouble();
                    final category = product['category'] ?? 'other';
                    final quantity = (item['quantity'] ?? 1).toInt();
                    final isLast = itemEntry.key == storeItems.length - 1;

                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                      decoration: BoxDecoration(
                        border: isLast
                            ? null
                            : Border(bottom: BorderSide(color: Colors.grey.shade800, width: 0.5)),
                      ),
                      child: Row(
                        children: [
                          // Icon
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.04),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey.shade800),
                            ),
                            child: Center(
                              child: Text(
                                _catEmoji[category] ?? '📦',
                                style: const TextStyle(fontSize: 22),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          // Info
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  productName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '₹${price.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    color: primaryGreen,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Quantity (display only for now)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.grey.shade800),
                            ),
                            child: _updatingId == productId
                                ? const SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : Text(
                                    'x$quantity',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ).animate().fadeIn(delay: (200 + groupEntry.key * 100).ms),
          );
        }),

        const SizedBox(height: 12),

        // ─── Order Summary ───
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: surfaceDark,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.grey.shade800),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Order Summary',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Subtotal (${items.length} items)',
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                  ),
                  Text(
                    '₹${total.toStringAsFixed(0)}',
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade400),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Delivery / Pickup',
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                  ),
                  const Text(
                    'Choose at checkout',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFFFF6B57),
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Container(height: 1, color: Colors.grey.shade800),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
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
              const SizedBox(height: 8),
              Text(
                '📦 Orders from ${grouped.length} shop(s) will be split at checkout',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
              ),
              const SizedBox(height: 18),
              // Checkout Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [primaryGreen, Color(0xFF059669)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: primaryGreen.withOpacity(0.35),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: () {
                      // TODO: Navigate to checkout
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text('Checkout coming soon!'),
                          backgroundColor: primaryGreen,
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Proceed to Checkout',
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
              ),
              const SizedBox(height: 12),
              // Continue Shopping
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => context.go('/browse'),
                  child: const Text(
                    '← Continue Shopping',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white60,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ).animate().fadeIn(delay: 400.ms),

        const SizedBox(height: 20),
      ],
    );
  }
}
