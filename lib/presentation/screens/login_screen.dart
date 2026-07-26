import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../core/theme/app_theme.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../controllers/login_controller.dart';
import '../widgets/peaceful_person_illustration.dart';
import '../widgets/shake_widget.dart';
import 'forgot_password_screen.dart';
import 'shell_screen.dart';
import 'signup_screen.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE LOGIN SCREEN (MATCHES EXACT ASCII WIREFRAME LAYOUT & COPY)
/// ════════════════════════════════════════════════════════════════════════════

class SoulCareLoginScreen extends StatefulWidget {
  final AppConfig config;

  const SoulCareLoginScreen({
    Key? key,
    this.config = AppConfig.local,
  }) : super(key: key);

  @override
  State<SoulCareLoginScreen> createState() => _SoulCareLoginScreenState();
}

class _SoulCareLoginScreenState extends State<SoulCareLoginScreen>
    with SingleTickerProviderStateMixin {
  late final LoginController _controller;

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  final FocusNode _emailFocusNode = FocusNode();
  final FocusNode _passwordFocusNode = FocusNode();

  final GlobalKey<ShakeWidgetState> _emailShakeKey = GlobalKey<ShakeWidgetState>();
  final GlobalKey<ShakeWidgetState> _passwordShakeKey = GlobalKey<ShakeWidgetState>();

  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();

    final remoteDataSource = AuthRemoteDataSourceImpl(config: widget.config);
    final storageService = SecureStorageService();
    final repository = AuthRepositoryImpl(
      remoteDataSource: remoteDataSource,
      storageService: storageService,
    );

    _controller = LoginController(repository: repository);
    _controller.addListener(() => setState(() {}));

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
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
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _showErrorSnackBar(String message) {
    if (!mounted) return;
    HapticFeedback.vibrate();

    if (_controller.emailError != null) {
      _emailShakeKey.currentState?.shake();
    }
    if (_controller.passwordError != null) {
      _passwordShakeKey.currentState?.shake();
    }

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 12),
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
        backgroundColor: AppTheme.errorRed,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
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
      TextInput.finishAutofillContext();
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 600),
          pageBuilder: (_, __, ___) => SoulCareShellScreen(config: widget.config),
          transitionsBuilder: (_, animation, __, child) =>
              FadeTransition(opacity: animation, child: child),
        ),
      );
    } else {
      _emailShakeKey.currentState?.shake();
      _passwordShakeKey.currentState?.shake();
    }
  }

  Future<void> _onGooglePressed() async {
    final success = await _controller.continueWithGoogle(
      onErrorSnackBar: _showErrorSnackBar,
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 600),
          pageBuilder: (_, __, ___) => SoulCareShellScreen(config: widget.config),
          transitionsBuilder: (_, animation, __, child) =>
              FadeTransition(opacity: animation, child: child),
        ),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
      body: Stack(
        children: [
          // Background Gradient Glow
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.lavenderPrimary.withOpacity(0.12),
              ),
            ),
          ),
          Positioned(
            bottom: -80,
            left: -60,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.mintSecondary.withOpacity(0.16),
              ),
            ),
          ),

          // Main Wireframe SingleChildScrollView
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: SlideTransition(
                    position: _slideAnimation,
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 440),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // ── TOP SECTION: ANIMATED ILLUSTRATION & HEADINGS ──
                          const PeacefulPersonIllustration(size: 140),
                          const SizedBox(height: 16),

                          const Text(
                            "Welcome Back 👋",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 30,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textMain,
                              letterSpacing: -0.6,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            "Continue your journey with SoulCare",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 15,
                              color: AppTheme.textSub,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 28),

                          // ── FLOATING GLASSMORPHISM CARD PANEL ──
                          Container(
                            padding: const EdgeInsets.all(28),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : Colors.white,
                              borderRadius: BorderRadius.circular(32),
                              border: Border.all(
                                color: isDark
                                    ? const Color(0xFF334155)
                                    : AppTheme.lavenderPrimary.withOpacity(0.08),
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.lavenderPrimary.withOpacity(0.06),
                                  blurRadius: 36,
                                  offset: const Offset(0, 12),
                                ),
                              ],
                            ),
                            child: AutofillGroup(
                              child: Column(
                                crossAxisAlignment: CrossAlignment.stretch,
                                children: [
                                  // ── EMAIL FIELD ──
                                  Row(
                                    children: const [
                                      Text(
                                        "📧 Email",
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: AppTheme.textMain,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  ShakeWidget(
                                    key: _emailShakeKey,
                                    child: TextField(
                                      controller: _emailController,
                                      focusNode: _emailFocusNode,
                                      keyboardType: TextInputType.emailAddress,
                                      textInputAction: TextInputAction.next,
                                      autofillHints: const [AutofillHints.email],
                                      enabled: !_controller.isLoading,
                                      style: TextStyle(
                                        fontSize: 15,
                                        color: isDark ? Colors.white : AppTheme.textMain,
                                      ),
                                      decoration: InputDecoration(
                                        hintText: "Enter your email",
                                        errorText: _controller.emailError,
                                        prefixIcon: Icon(
                                          Icons.mail_outline_rounded,
                                          color: _emailFocusNode.hasFocus
                                              ? AppTheme.lavenderPrimary
                                              : AppTheme.textMuted,
                                        ),
                                      ),
                                      onSubmitted: (_) {
                                        FocusScope.of(context)
                                            .requestFocus(_passwordFocusNode);
                                      },
                                    ),
                                  ),
                                  const SizedBox(height: 18),

                                  // ── PASSWORD FIELD ──
                                  Row(
                                    children: const [
                                      Text(
                                        "🔒 Password",
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: AppTheme.textMain,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  ShakeWidget(
                                    key: _passwordShakeKey,
                                    child: TextField(
                                      controller: _passwordController,
                                      focusNode: _passwordFocusNode,
                                      obscureText: !_controller.isPasswordVisible,
                                      textInputAction: TextInputAction.done,
                                      autofillHints: const [AutofillHints.password],
                                      enabled: !_controller.isLoading,
                                      style: TextStyle(
                                        fontSize: 15,
                                        color: isDark ? Colors.white : AppTheme.textMain,
                                      ),
                                      decoration: InputDecoration(
                                        hintText: "Enter your password",
                                        errorText: _controller.passwordError,
                                        prefixIcon: Icon(
                                          Icons.lock_outline_rounded,
                                          color: _passwordFocusNode.hasFocus
                                              ? AppTheme.lavenderPrimary
                                              : AppTheme.textMuted,
                                        ),
                                        suffixIcon: IconButton(
                                          icon: Icon(
                                            _controller.isPasswordVisible
                                                ? Icons.visibility_off_outlined
                                                : Icons.visibility_outlined,
                                            color: AppTheme.textMuted,
                                          ),
                                          onPressed:
                                              _controller.togglePasswordVisibility,
                                        ),
                                      ),
                                      onSubmitted: (_) => _onLoginPressed(),
                                    ),
                                  ),

                                  // ── FORGOT PASSWORD ──
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton(
                                      onPressed: _controller.isLoading
                                          ? null
                                          : _onForgotPasswordPressed,
                                      style: TextButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                        minimumSize: Size.zero,
                                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                      ),
                                      child: const Text(
                                        "Forgot Password?",
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: AppTheme.lavenderPrimary,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 20),

                                  // ── GRADIENT CONTINUE BUTTON ──
                                  SizedBox(
                                    height: 56,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        gradient: const LinearGradient(
                                          colors: [
                                            Color(0xFF7C6EF6),
                                            Color(0xFF6366F1),
                                          ],
                                        ),
                                        borderRadius: BorderRadius.circular(20),
                                        boxShadow: [
                                          BoxShadow(
                                            color: const Color(0xFF7C6EF6)
                                                .withOpacity(0.35),
                                            blurRadius: 16,
                                            offset: const Offset(0, 6),
                                          ),
                                        ],
                                      ),
                                      child: ElevatedButton(
                                        onPressed:
                                            _controller.isLoading ? null : _onLoginPressed,
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.transparent,
                                          shadowColor: Colors.transparent,
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(20),
                                          ),
                                        ),
                                        child: _controller.isLoading
                                            ? const SizedBox(
                                                width: 24,
                                                height: 24,
                                                child: CircularProgressIndicator(
                                                  strokeWidth: 2.5,
                                                  valueColor:
                                                      AlwaysStoppedAnimation<Color>(
                                                          Colors.white),
                                                ),
                                              )
                                            : Row(
                                                mainAxisAlignment:
                                                    MainState.center,
                                                children: const [
                                                  Text(
                                                    "Continue",
                                                    style: TextStyle(
                                                      fontSize: 16.5,
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                  SizedBox(width: 8),
                                                  Icon(Icons.arrow_forward_rounded,
                                                      size: 20),
                                                ],
                                              ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 22),

                                  // ── DIVIDER 'OR' ──
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Divider(
                                          color: isDark
                                              ? const Color(0xFF334155)
                                              : const Color(0xFFE2E8F0),
                                        ),
                                      ),
                                      const Padding(
                                        padding: EdgeInsets.symmetric(horizontal: 12),
                                        child: Text(
                                          "OR",
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.textMuted,
                                          ),
                                        ),
                                      ),
                                      Expanded(
                                        child: Divider(
                                          color: isDark
                                              ? const Color(0xFF334155)
                                              : const Color(0xFFE2E8F0),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 22),

                                  // ── CONTINUE WITH GOOGLE BUTTON ──
                                  SizedBox(
                                    height: 56,
                                    child: OutlinedButton(
                                      onPressed:
                                          _controller.isLoading ? null : _onGooglePressed,
                                      style: OutlinedButton.styleFrom(
                                        backgroundColor: isDark
                                            ? const Color(0xFF0F172A)
                                            : Colors.white,
                                        foregroundColor: isDark
                                            ? Colors.white
                                            : const Color(0xFF3C4043),
                                        side: BorderSide(
                                          color: isDark
                                              ? const Color(0xFF334155)
                                              : const Color(0xFFDADCE0),
                                        ),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainState.center,
                                        children: const [
                                          Text(
                                            "G",
                                            style: TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.w900,
                                              color: Color(0xFF4285F4),
                                            ),
                                          ),
                                          SizedBox(width: 12),
                                          Text(
                                            "Continue with Google",
                                            style: TextStyle(
                                              fontSize: 15.5,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 26),

                                  // ── FOOTER: CREATE ACCOUNT ──
                                  Row(
                                    mainAxisAlignment: MainState.center,
                                    children: [
                                      Text(
                                        "Don't have an account? ",
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isDark
                                              ? Colors.white70
                                              : AppTheme.textSub,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      GestureDetector(
                                        onTap: _controller.isLoading
                                            ? null
                                            : _onCreateAccountPressed,
                                        child: Row(
                                          children: const [
                                            Text(
                                              "Create Account",
                                              style: TextStyle(
                                                fontSize: 14,
                                                color: AppTheme.lavenderPrimary,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            SizedBox(width: 2),
                                            Icon(
                                              Icons.arrow_forward_rounded,
                                              size: 14,
                                              color: AppTheme.lavenderPrimary,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
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
