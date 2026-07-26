import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../controllers/login_controller.dart';
import 'check_email_screen.dart';
import 'dashboard_screen.dart';
import 'forgot_password_screen.dart';
import 'shell_screen.dart';
import 'signup_screen.dart';


/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE PREMIUM LOGIN SCREEN (PRODUCTION READY)
/// Clean Architecture | Material Design 3 | Calming Lavender & Mint Theme
/// ════════════════════════════════════════════════════════════════════════════

class SoulCareLoginScreen extends StatefulWidget {
  final AppConfig config;

  const SoulCareLoginScreen({
    Key? key,
    this.config = AppConfig.dev,
  }) : super(key: key);

  @override
  State<SoulCareLoginScreen> createState() => _SoulCareLoginScreenState();
}

class _SoulCareLoginScreenState extends State<SoulCareLoginScreen>
    with SingleTickerProviderStateMixin {
  late final LoginController _controller;

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  // Design System Color Tokens
  static const Color _lavenderPrimary = Color(0xFF6750A4);
  static const Color _lavenderBackground = Color(0xFFF7F5FA);
  static const Color _lavenderSurfaceTint = Color(0xFFE8DEF8);
  static const Color _mintAccent = Color(0xFF2D6A4F);
  static const Color _mintLight = Color(0xFFE8F5E9);
  static const Color _textMain = Color(0xFF1D1B20);
  static const Color _textSub = Color(0xFF49454F);
  static const Color _textMuted = Color(0xFF79747E);

  @override
  void initState() {
    super.initState();

    // Initialize Clean Architecture Dependencies
    final remoteDataSource = AuthRemoteDataSourceImpl(config: widget.config);
    final storageService = SecureStorageService();
    final repository = AuthRepositoryImpl(
      remoteDataSource: remoteDataSource,
      storageService: storageService,
    );

    _controller = LoginController(repository: repository);
    _controller.addListener(() => setState(() {}));

    // Micro-animations setup
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    ));

    _animController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _showErrorSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFFB3261E), // M3 Error Container
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  Future<void> _onLoginPressed() async {
    final success = await _controller.login(
      email: _emailController.text,
      password: _passwordController.text,
      onErrorSnackBar: _showErrorSnackBar,
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const SoulCareShellScreen()),
      );
    }

  }

  Future<void> _onGooglePressed() async {
    final success = await _controller.continueWithGoogle(
      onErrorSnackBar: _showErrorSnackBar,
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const SoulCareShellScreen()),
      );
    }
  }

  void _onForgotPasswordPressed() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ForgotPasswordScreen(
          repository: _controller.repository,
          initialEmail: _emailController.text,
        ),
      ),
    );
  }

  void _onCreateAccountPressed() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const SignupScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _lavenderBackground,
      body: Stack(
        children: [
          // Calming Glowing Background Orbs
          Positioned(
            top: -60,
            left: -60,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _lavenderSurfaceTint.withOpacity(0.55),
              ),
            ),
          ),
          Positioned(
            bottom: -80,
            right: -60,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _mintLight.withOpacity(0.75),
              ),
            ),
          ),

          // Main Responsive Card Container
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: SlideTransition(
                    position: _slideAnimation,
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 420),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 28,
                        vertical: 32,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(
                          color: _lavenderPrimary.withOpacity(0.08),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _lavenderPrimary.withOpacity(0.08),
                            blurRadius: 36,
                            offset: const Offset(0, 12),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAlignment.stretch,
                        children: [
                          // ── LOGO & WELCOME HEADER ──
                          Center(
                            child: Container(
                              width: 68,
                              height: 68,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [_lavenderSurfaceTint, _mintLight],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(22),
                                boxShadow: [
                                  BoxShadow(
                                    color: _lavenderPrimary.withOpacity(0.12),
                                    blurRadius: 16,
                                    offset: const Offset(0, 6),
                                  )
                                ],
                              ),
                              child: const Icon(
                                Icons.spa_rounded,
                                size: 38,
                                color: _lavenderPrimary,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            "SoulCare",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: _textMain,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            "You're not alone. Let's begin your journey.",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              color: _textSub,
                              height: 1.4,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 28),

                          // ── EMAIL TEXTFIELD WITH INLINE ERROR ──
                          const Text(
                            "Email Address",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: _textSub,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            enabled: !_controller.isLoading,
                            style: const TextStyle(fontSize: 15, color: _textMain),
                            decoration: InputDecoration(
                              hintText: "name@example.com",
                              hintStyle: const TextStyle(color: _textMuted),
                              errorText: _controller.emailError,
                              prefixIcon: const Icon(
                                Icons.mail_outline_rounded,
                                color: _textMuted,
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),

                          // ── PASSWORD TEXTFIELD WITH INLINE ERROR & EYE TOGGLE ──
                          const Text(
                            "Password",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: _textSub,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _passwordController,
                            obscureText: !_controller.isPasswordVisible,
                            enabled: !_controller.isLoading,
                            style: const TextStyle(fontSize: 15, color: _textMain),
                            decoration: InputDecoration(
                              hintText: "Enter your password",
                              hintStyle: const TextStyle(color: _textMuted),
                              errorText: _controller.passwordError,
                              prefixIcon: const Icon(
                                Icons.lock_outline_rounded,
                                color: _textMuted,
                              ),
                              suffixIcon: IconButton(
                                icon: AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 200),
                                  child: Icon(
                                    _controller.isPasswordVisible
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                    key: ValueKey(_controller.isPasswordVisible),
                                    color: _textMuted,
                                  ),
                                ),
                                onPressed: _controller.togglePasswordVisibility,
                              ),
                            ),
                          ),

                          // ── FORGOT PASSWORD LINK ──
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: _controller.isLoading
                                  ? null
                                  : _onForgotPasswordPressed,
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 6,
                                  horizontal: 4,
                                ),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text(
                                "Forgot Password?",
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: _lavenderPrimary,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // ── LOGIN BUTTON ──
                          SizedBox(
                            height: 52,
                            child: ElevatedButton(
                              onPressed:
                                  _controller.isLoading ? null : _onLoginPressed,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _lavenderPrimary,
                                foregroundColor: Colors.white,
                                elevation: 4,
                                shadowColor: _lavenderPrimary.withOpacity(0.4),
                                shape: const StadiumBorder(),
                              ),
                              child: _controller.isLoading
                                  ? const SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.5,
                                        valueColor: AlwaysStoppedAnimation<Color>(
                                            Colors.white),
                                      ),
                                    )
                                  : const Text(
                                      "Log In",
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                            ),
                          ),
                          const SizedBox(height: 22),

                          // ── DIVIDER WITH 'OR' ──
                          Row(
                            children: const [
                              Expanded(
                                  child: Divider(color: Color(0xFFE6E1E5))),
                              Padding(
                                padding: EdgeInsets.symmetric(horizontal: 12),
                                child: Text(
                                  "OR",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: _textMuted,
                                  ),
                                ),
                              ),
                              Expanded(
                                  child: Divider(color: Color(0xFFE6E1E5))),
                            ],
                          ),
                          const SizedBox(height: 22),

                          // ── CONTINUE WITH GOOGLE BUTTON (GOOGLE BRANDING) ──
                          SizedBox(
                            height: 52,
                            child: OutlinedButton(
                              onPressed:
                                  _controller.isLoading ? null : _onGooglePressed,
                              style: OutlinedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: const Color(0xFF3C4043),
                                side: const BorderSide(color: Color(0xFFDADCE0)),
                                shape: const StadiumBorder(),
                              ),
                              child: Row(
                                mainAxisAlignment: MainState.center,
                                children: [
                                  // Official Google G Badge
                                  Container(
                                    width: 20,
                                    height: 20,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Colors.white,
                                    ),
                                    child: const Center(
                                      child: Text(
                                        "G",
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w900,
                                          color: Color(0xFF4285F4),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  const Text(
                                    "Continue with Google",
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // ── CREATE ACCOUNT BUTTON ──
                          Row(
                            mainAxisAlignment: MainState.center,
                            children: [
                              const Text(
                                "Don't have an account? ",
                                style: TextStyle(
                                  fontSize: 14,
                                  color: _textSub,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              GestureDetector(
                                onTap: _controller.isLoading
                                    ? null
                                    : _onCreateAccountPressed,
                                child: const Text(
                                  "Create Account",
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: _mintAccent,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // ── TERMS & PRIVACY FOOTER ──
                          Center(
                            child: RichText(
                              textAlign: TextAlign.center,
                              text: TextSpan(
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: _textMuted,
                                  height: 1.4,
                                ),
                                children: [
                                  const TextSpan(
                                      text: "By continuing, you agree to SoulCare's "),
                                  TextSpan(
                                    text: "Terms of Service",
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      decoration: TextDecoration.underline,
                                    ),
                                    recognizer: TapGestureRecognizer()
                                      ..onTap = () {},
                                  ),
                                  const TextSpan(text: " and "),
                                  TextSpan(
                                    text: "Privacy Policy",
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      decoration: TextDecoration.underline,
                                    ),
                                    recognizer: TapGestureRecognizer()
                                      ..onTap = () {},
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
