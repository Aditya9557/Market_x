import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _shopNameController = TextEditingController();
  bool _obscurePassword = true;
  String _selectedRole = 'student';
  String? _error;

  final List<Map<String, String>> _roles = [
    {'id': 'student', 'emoji': '🎓', 'label': 'Student', 'desc': 'Shop, order & deliver'},
    {'id': 'shopkeeper', 'emoji': '🏪', 'label': 'Shopkeeper', 'desc': 'Sell on campus'},
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _shopNameController.dispose();
    super.dispose();
  }

  Future<void> _handleSignup() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters');
      return;
    }
    if (_selectedRole == 'shopkeeper' && _shopNameController.text.trim().isEmpty) {
      setState(() => _error = 'Please enter your shop name');
      return;
    }

    setState(() => _error = null);

    final userData = {
      'name': name,
      'email': email,
      'password': password,
      'role': _selectedRole,
      if (_selectedRole == 'shopkeeper') 'shopName': _shopNameController.text.trim(),
    };

    await ref.read(authProvider.notifier).signup(userData);

    if (!mounted) return;
    final authState = ref.read(authProvider);

    if (authState.error != null) {
      setState(() => _error = authState.error);
    } else if (authState.user != null) {
      final role = authState.user!.role;
      switch (role) {
        case 'hero':
          context.go('/hero');
        case 'student':
          context.go('/browse');
        default:
          context.go('/browse');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF111827), Color(0xFF0d0d14), Color(0xFF0a130a)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 30),

                // ─── Back Button ───
                GestureDetector(
                  onTap: () => context.go('/login'),
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.06),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                    ),
                    child: const Icon(Icons.arrow_back, color: Colors.white70, size: 20),
                  ),
                ).animate().fadeIn(duration: 400.ms),

                const SizedBox(height: 28),

                // ─── Header ───
                const Text(
                  'Create Account ✨',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ).animate().fadeIn(delay: 100.ms, duration: 500.ms).slideX(begin: -0.1, end: 0),

                const SizedBox(height: 6),
                Text(
                  'Join the Market_x Campus Community',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                ).animate().fadeIn(delay: 150.ms, duration: 500.ms),

                const SizedBox(height: 30),

                // ─── Error ───
                if (_error != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD93A3A).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFD93A3A).withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Text('⚠️', style: TextStyle(fontSize: 18)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _error!,
                            style: const TextStyle(color: Color(0xFFFF6B6B), fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn().shake(),
                  const SizedBox(height: 18),
                ],

                // ─── Role Selector ───
                Text(
                  'I AM A...',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.5,
                    color: Colors.grey.shade500,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: _roles.map((role) {
                    final isSelected = _selectedRole == role['id'];
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedRole = role['id']!),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          margin: EdgeInsets.only(
                            right: role['id'] == _roles.last['id'] ? 0 : 10,
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? primaryGreen.withOpacity(0.12)
                                : Colors.white.withOpacity(0.03),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelected
                                  ? primaryGreen.withOpacity(0.5)
                                  : Colors.white.withOpacity(0.07),
                              width: isSelected ? 1.5 : 1,
                            ),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: primaryGreen.withOpacity(0.15),
                                      blurRadius: 20,
                                    ),
                                  ]
                                : null,
                          ),
                          child: Column(
                            children: [
                              Text(
                                role['emoji']!,
                                style: const TextStyle(fontSize: 26),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                role['label']!,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? primaryGreen : Colors.grey.shade400,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                role['desc']!,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ).animate().fadeIn(delay: 200.ms, duration: 500.ms),

                const SizedBox(height: 22),

                // ─── Name Field ───
                _buildTextField(
                  controller: _nameController,
                  label: 'FULL NAME',
                  hint: 'Your full name',
                  icon: Icons.person_outline,
                ).animate().fadeIn(delay: 250.ms, duration: 500.ms),

                const SizedBox(height: 16),

                // ─── Shop Name (conditional) ───
                if (_selectedRole == 'shopkeeper') ...[
                  _buildTextField(
                    controller: _shopNameController,
                    label: 'SHOP NAME',
                    hint: 'My Campus Shop',
                    icon: Icons.storefront_outlined,
                  ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.1, end: 0),
                  const SizedBox(height: 16),
                ],

                // ─── Email Field ───
                _buildTextField(
                  controller: _emailController,
                  label: 'EMAIL ADDRESS',
                  hint: 'you@university.edu',
                  icon: Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                ).animate().fadeIn(delay: 300.ms, duration: 500.ms),

                const SizedBox(height: 16),

                // ─── Password Field ───
                _buildTextField(
                  controller: _passwordController,
                  label: 'PASSWORD',
                  hint: 'Min. 6 characters',
                  icon: Icons.lock_outline,
                  isPassword: true,
                ).animate().fadeIn(delay: 350.ms, duration: 500.ms),

                // ─── Admin Note for Shopkeeper ───
                if (_selectedRole == 'shopkeeper') ...[
                  const SizedBox(height: 18),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFCC00).withOpacity(0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: const Color(0xFFFFCC00).withOpacity(0.2),
                      ),
                    ),
                    child: const Row(
                      children: [
                        Text('⏳', style: TextStyle(fontSize: 16)),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Your shop requires admin approval before being visible to customers.',
                            style: TextStyle(
                              color: Color(0xFFFFCC00),
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 400.ms),
                ],

                const SizedBox(height: 28),

                // ─── Sign Up Button ───
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
                      onPressed: authState.isLoading ? null : _handleSignup,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: authState.isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              'Join Market_x ${_selectedRole == 'shopkeeper' ? '🏪' : '🎓'}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: 0.3,
                              ),
                            ),
                    ),
                  ),
                ).animate().fadeIn(delay: 400.ms, duration: 500.ms).slideY(begin: 0.1, end: 0),

                const SizedBox(height: 24),

                // ─── Login Link ───
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Already have an account? ',
                      style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                    ),
                    GestureDetector(
                      onTap: () => context.go('/login'),
                      child: const Text(
                        'Sign In',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: primaryGreen,
                        ),
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 500.ms, duration: 500.ms),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool isPassword = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
            color: Colors.grey.shade500,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: TextField(
            controller: controller,
            obscureText: isPassword ? _obscurePassword : false,
            keyboardType: keyboardType,
            style: const TextStyle(color: Colors.white, fontSize: 15),
            decoration: InputDecoration(
              prefixIcon: Icon(icon, color: Colors.grey.shade600, size: 20),
              suffixIcon: isPassword
                  ? IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        color: Colors.grey.shade600,
                        size: 20,
                      ),
                      onPressed: () {
                        setState(() => _obscurePassword = !_obscurePassword);
                      },
                    )
                  : null,
              hintText: hint,
              hintStyle: TextStyle(color: Colors.grey.shade700, fontSize: 14),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            ),
          ),
        ),
      ],
    );
  }
}
