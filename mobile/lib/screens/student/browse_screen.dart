import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

class BrowseScreen extends ConsumerStatefulWidget {
  const BrowseScreen({super.key});

  @override
  ConsumerState<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends ConsumerState<BrowseScreen> {
  final _api = ApiClient();
  final _searchController = TextEditingController();

  List<dynamic> _products = [];
  bool _loading = true;
  String _selectedCategory = 'all';
  String? _addingToCartId;
  String? _toastMessage;

  static const _categories = ['all', 'food', 'books', 'stationery', 'electronics', 'clothing', 'other'];
  static const _catEmoji = {
    'all': '🌐',
    'food': '🍔',
    'books': '📚',
    'stationery': '✏️',
    'electronics': '💻',
    'clothing': '👕',
    'other': '📦',
  };

  @override
  void initState() {
    super.initState();
    _fetchProducts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchProducts() async {
    setState(() => _loading = true);
    try {
      final products = await _api.getProducts(
        search: _searchController.text.isEmpty ? null : _searchController.text,
        category: _selectedCategory == 'all' ? null : _selectedCategory,
      );
      setState(() => _products = products);
    } catch (e) {
      debugPrint('Error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _addToCart(String productId) async {
    setState(() => _addingToCartId = productId);
    try {
      await _api.addToCart(productId, 1);
      _showToast('✅ Added to cart!');
    } catch (e) {
      _showToast('❌ Failed to add');
    } finally {
      setState(() => _addingToCartId = null);
    }
  }

  void _showToast(String message) {
    setState(() => _toastMessage = message);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _toastMessage = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            RefreshIndicator(
              onRefresh: _fetchProducts,
              color: primaryGreen,
              child: CustomScrollView(
                slivers: [
                  // ─── Header ───
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Browse Products',
                                    style: TextStyle(
                                      fontSize: 26,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Discover items from campus shops',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey.shade500,
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
                                    border: Border.all(
                                      color: Colors.white.withOpacity(0.08),
                                    ),
                                  ),
                                  child: const Icon(
                                    Icons.logout,
                                    color: Colors.white54,
                                    size: 20,
                                  ),
                                ),
                              ),
                            ],
                          ).animate().fadeIn(duration: 500.ms),

                          const SizedBox(height: 20),

                          // ─── Search Bar ───
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.04),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: Colors.white.withOpacity(0.08),
                              ),
                            ),
                            child: TextField(
                              controller: _searchController,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                              ),
                              onSubmitted: (_) => _fetchProducts(),
                              decoration: InputDecoration(
                                prefixIcon: Icon(
                                  Icons.search,
                                  color: Colors.grey.shade600,
                                  size: 22,
                                ),
                                hintText: 'Search products, shops...',
                                hintStyle: TextStyle(
                                  color: Colors.grey.shade700,
                                  fontSize: 14,
                                ),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 16,
                                ),
                                suffixIcon: _searchController.text.isNotEmpty
                                    ? IconButton(
                                        icon: Icon(
                                          Icons.close,
                                          color: Colors.grey.shade600,
                                          size: 18,
                                        ),
                                        onPressed: () {
                                          _searchController.clear();
                                          _fetchProducts();
                                        },
                                      )
                                    : null,
                              ),
                            ),
                          ).animate().fadeIn(delay: 100.ms, duration: 500.ms),

                          const SizedBox(height: 14),

                          // ─── Category Chips ───
                          SizedBox(
                            height: 40,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: _categories.length,
                              itemBuilder: (context, index) {
                                final cat = _categories[index];
                                final isSelected = _selectedCategory == cat;
                                return Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: GestureDetector(
                                    onTap: () {
                                      setState(() => _selectedCategory = cat);
                                      _fetchProducts();
                                    },
                                    child: AnimatedContainer(
                                      duration: const Duration(milliseconds: 250),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                        vertical: 8,
                                      ),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(20),
                                        color: isSelected
                                            ? primaryGreen.withOpacity(0.15)
                                            : Colors.white.withOpacity(0.04),
                                        border: Border.all(
                                          color: isSelected
                                              ? primaryGreen.withOpacity(0.5)
                                              : Colors.white.withOpacity(0.08),
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          if (cat != 'all')
                                            Padding(
                                              padding: const EdgeInsets.only(right: 4),
                                              child: Text(
                                                _catEmoji[cat] ?? '📦',
                                                style: const TextStyle(fontSize: 14),
                                              ),
                                            ),
                                          Text(
                                            cat[0].toUpperCase() + cat.substring(1),
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w600,
                                              color: isSelected
                                                  ? primaryGreen
                                                  : Colors.grey.shade500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ).animate().fadeIn(delay: 200.ms, duration: 500.ms),

                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ),

                  // ─── Products Grid ───
                  if (_loading)
                    const SliverFillRemaining(
                      child: Center(
                        child: CircularProgressIndicator(color: primaryGreen),
                      ),
                    )
                  else if (_products.isEmpty)
                    SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('🔍', style: TextStyle(fontSize: 56)),
                            const SizedBox(height: 16),
                            const Text(
                              'No products found',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Try a different search or category',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ),
                      ).animate().fadeIn(duration: 600.ms),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      sliver: SliverGrid(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 14,
                          crossAxisSpacing: 14,
                          childAspectRatio: 0.62,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final product = _products[index] as Map<String, dynamic>;
                            return _buildProductCard(product, index);
                          },
                          childCount: _products.length,
                        ),
                      ),
                    ),

                  const SliverToBoxAdapter(child: SizedBox(height: 20)),
                ],
              ),
            ),

            // ─── Toast ───
            if (_toastMessage != null)
              Positioned(
                top: 10,
                left: 20,
                right: 20,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  decoration: BoxDecoration(
                    color: _toastMessage!.startsWith('✅')
                        ? primaryGreen.withOpacity(0.9)
                        : Colors.red.withOpacity(0.9),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 20,
                      ),
                    ],
                  ),
                  child: Text(
                    _toastMessage!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ).animate().fadeIn().slideY(begin: -0.5, end: 0),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> product, int index) {
    final name = product['name'] ?? 'Product';
    final price = (product['price'] ?? 0).toDouble();
    final compareAtPrice = (product['compareAtPrice'] ?? 0).toDouble();
    final inventory = product['inventory'] ?? 0;
    final category = product['category'] ?? 'other';
    final storeName = product['store']?['name'] ?? 'Campus Shop';
    final images = product['images'] as List? ?? [];
    final productId = product['_id'] ?? '';

    return Container(
      decoration: BoxDecoration(
        color: surfaceDark,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade800),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── Image Area ───
          ClipRRect(
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(18),
              topRight: Radius.circular(18),
            ),
            child: Container(
              height: 100,
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1a1a2e), Color(0xFF12122a)],
                ),
              ),
              child: Stack(
                children: [
                  Center(
                    child: images.isNotEmpty
                        ? Image.network(
                            images[0],
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: double.infinity,
                            errorBuilder: (_, __, ___) => Text(
                              _catEmoji[category] ?? '📦',
                              style: const TextStyle(fontSize: 40),
                            ),
                          )
                        : Text(
                            _catEmoji[category] ?? '📦',
                            style: const TextStyle(fontSize: 40),
                          ),
                  ),
                  if (inventory <= 0)
                    Container(
                      color: Colors.black.withOpacity(0.6),
                      child: const Center(
                        child: Text(
                          'Out of Stock',
                          style: TextStyle(
                            color: Color(0xFFFF6B57),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  if (compareAtPrice > price && compareAtPrice > 0)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF6B57),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'SALE',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // ─── Product Details ───
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Store name
                  Text(
                    '🏪 $storeName',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFFFF6B57),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),

                  // Product name
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const Spacer(),

                  // Price
                  Row(
                    children: [
                      Text(
                        '₹${price.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: primaryGreen,
                        ),
                      ),
                      if (compareAtPrice > price && compareAtPrice > 0) ...[
                        const SizedBox(width: 6),
                        Text(
                          '₹${compareAtPrice.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 12,
                            decoration: TextDecoration.lineThrough,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    inventory > 0 ? '$inventory left' : 'Sold out',
                    style: TextStyle(
                      fontSize: 11,
                      color: inventory > 0 ? primaryGreen : Colors.red,
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Add to Cart Button
                  SizedBox(
                    width: double.infinity,
                    height: 36,
                    child: ElevatedButton(
                      onPressed: inventory <= 0 || _addingToCartId == productId
                          ? null
                          : () => _addToCart(productId),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryGreen,
                        disabledBackgroundColor: Colors.grey.shade800,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: EdgeInsets.zero,
                      ),
                      child: _addingToCartId == productId
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              inventory <= 0 ? 'Out of Stock' : '🛒 Add',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: (200 + index * 80).ms).scale(
          begin: const Offset(0.95, 0.95),
          end: const Offset(1, 1),
        );
  }
}
