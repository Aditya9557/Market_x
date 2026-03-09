import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please enter email and password');
      return;
    }

    setState(() => _error = null);
    await ref.read(authProvider.notifier).login(email, password);

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
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF111827), Color(0xFF0d0d14), Color(0xFF130a0a)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              children: [
                SizedBox(height: size.height * 0.06),

                // ─── Logo ───
                _buildLogo()
                    .animate()
                    .fadeIn(duration: 600.ms)
                    .slideY(begin: -0.3, end: 0),

                const SizedBox(height: 40),

                // ─── Welcome Text ───
                Column(
                  children: [
                    const Text(
                      'Welcome Back 👋',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Log in to continue to Market_x',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                )
                    .animate()
                    .fadeIn(delay: 200.ms, duration: 600.ms)
                    .slideY(begin: 0.2, end: 0),

                const SizedBox(height: 36),

                // ─── Error ───
                if (_error != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD93A3A).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: const Color(0xFFD93A3A).withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Text('⚠️', style: TextStyle(fontSize: 18)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _error!,
                            style: const TextStyle(
                              color: Color(0xFFFF6B6B),
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn().shake(),
                  const SizedBox(height: 20),
                ],

                // ─── Email Field ───
                _buildTextField(
                  controller: _emailController,
                  label: 'EMAIL ADDRESS',
                  hint: 'you@university.edu',
                  icon: Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                )
                    .animate()
                    .fadeIn(delay: 300.ms, duration: 500.ms)
                    .slideX(begin: -0.1, end: 0),

                const SizedBox(height: 18),

                // ─── Password Field ───
                _buildTextField(
                  controller: _passwordController,
                  label: 'PASSWORD',
                  hint: '••••••••',
                  icon: Icons.lock_outline,
                  isPassword: true,
                )
                    .animate()
                    .fadeIn(delay: 400.ms, duration: 500.ms)
                    .slideX(begin: -0.1, end: 0),

                const SizedBox(height: 28),

                // ─── Login Button ───
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
                      onPressed: authState.isLoading ? null : _handleLogin,
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
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Sign In',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                                SizedBox(width: 8),
                                Icon(Icons.arrow_forward, size: 20, color: Colors.white),
                              ],
                            ),
                    ),
                  ),
                )
                    .animate()
                    .fadeIn(delay: 500.ms, duration: 500.ms)
                    .slideY(begin: 0.2, end: 0),

                const SizedBox(height: 28),

                // ─── Divider ───
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 1,
                        color: Colors.white.withValues(alpha: 0.06),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'or',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Container(
                        height: 1,
                        color: Colors.white.withValues(alpha: 0.06),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 28),

                // ─── Sign Up Link ───
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Don't have an account? ",
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade500,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => context.go('/signup'),
                      child: const Text(
                        'Sign Up',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: primaryGreen,
                        ),
                      ),
                    ),
                  ],
                )
                    .animate()
                    .fadeIn(delay: 600.ms, duration: 500.ms),

                const SizedBox(height: 40),

                // ─── Feature Chips ───
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.center,
                  children: [
                    '🛍️ Campus Shops',
                    '🦸 Hero Delivery',
                    '🎓 Uni Guide',
                  ].map((chip) => _buildChip(chip)).toList(),
                )
                    .animate()
                    .fadeIn(delay: 700.ms, duration: 500.ms),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          colors: [primaryGreen, Color(0xFF059669), primaryBlue],
        ),
        boxShadow: [
          BoxShadow(
            color: primaryGreen.withValues(alpha: 0.35),
            blurRadius: 40,
            spreadRadius: 4,
          ),
        ],
      ),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'M',
            style: TextStyle(
              color: Colors.white,
              fontSize: 36,
              fontWeight: FontWeight.w900,
              height: 1,
            ),
          ),
          Text(
            'x',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 16,
              fontWeight: FontWeight.w700,
              height: 1,
            ),
          ),
        ],
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
            color: Colors.white.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.08),
            ),
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
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 16,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildChip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: primaryGreen.withValues(alpha: 0.25),
        ),
        color: primaryGreen.withValues(alpha: 0.06),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: primaryGreen.withValues(alpha: 0.9),
        ),
      ),
    );
  }
}
