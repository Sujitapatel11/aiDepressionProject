import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../presentation/screens/forgot_password_screen.dart';
import '../../../../presentation/screens/shell_screen.dart';
import '../../../../presentation/screens/signup_screen.dart';
import '../../../../presentation/widgets/shake_widget.dart';

import '../providers/auth_providers.dart';
import '../controllers/login_controller.dart';
import '../controllers/session_manager.dart';
import '../../widgets/auth_card.dart';
import '../../widgets/auth_footer.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/email_text_field.dart';
import '../../widgets/google_login_button.dart';
import '../../widgets/login_button.dart';
import '../../widgets/password_text_field.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE LOGIN SCREEN (PRODUCTION CLEAN ARCHITECTURE IMPLEMENTATION)
/// Includes Google Sign-In SDK Integration & Token Exchange
/// ════════════════════════════════════════════════════════════════════════════

class SoulCareLoginScreenFeature extends StatefulWidget {
  final AppConfig config;

  const SoulCareLoginScreenFeature({
    Key? key,
    this.config = AppConfig.local,
  }) : super(key: key);

  @override
  State<SoulCareLoginScreenFeature> createState() =>
      _SoulCareLoginScreenFeatureState();
}

class _SoulCareLoginScreenFeatureState
    extends State<SoulCareLoginScreenFeature>
    with SingleTickerProviderStateMixin {
  late final LoginController _controller;
  late final SessionManager _sessionManager;

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

    final repository = AuthProviders.repository(config: widget.config);
    final loginUseCase = AuthProviders.loginUseCase(config: widget.config);
    final secureStorage = AuthProviders.secureStorage;

    _sessionManager = SessionManager(
      repository: repository,
      secureStorage: secureStorage,
    );

    _controller = LoginController(
      loginUseCase: loginUseCase,
      repository: repository,
      sessionManager: _sessionManager,
    );

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

  Future<void> _onLoginPressed() async {
    if (_controller.state.isLoading) return;

    FocusScope.of(context).unfocus();

    final success = await _controller.login(
      email: _emailController.text,
      password: _passwordController.text,
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
      HapticFeedback.vibrate();
      if (_controller.state.emailError != null) {
        _emailShakeKey.currentState?.shake();
      }
      if (_controller.state.passwordError != null) {
        _passwordShakeKey.currentState?.shake();
      }
    }
  }

  Future<void> _onGoogleLoginPressed() async {
    if (_controller.state.isLoading) return;
    FocusScope.of(context).unfocus();

    final success = await _controller.continueWithGoogle(
      AuthProviders.googleAuthService,
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
    } else if (_controller.state.generalError != null) {
      HapticFeedback.vibrate();
    }
  }

  void _onForgotPasswordPressed() {
    if (_controller.state.isLoading) return;
    FocusScope.of(context).unfocus();

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ForgotPasswordScreen(
          repository: AuthProviders.repository(config: widget.config),
          initialEmail: _emailController.text,
        ),
      ),
    );
  }

  void _onCreateAccountPressed() {
    if (_controller.state.isLoading) return;
    FocusScope.of(context).unfocus();

    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const SignupScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = _controller.state;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
        body: Stack(
          children: [
            // Background Orbs
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
                            const AuthHeader(),
                            const SizedBox(height: 28),

                            AuthCard(
                              child: AutofillGroup(
                                child: Column(
                                  crossAxisAlignment: CrossAlignment.stretch,
                                  children: [
                                    // Inline Error Banner
                                    if (state.generalError != null) ...[
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: AppTheme.errorRed.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(16),
                                          border: Border.all(
                                            color: AppTheme.errorRed.withOpacity(0.3),
                                          ),
                                        ),
                                        child: Row(
                                          children: [
                                            const Icon(
                                              Icons.error_outline_rounded,
                                              color: AppTheme.errorRed,
                                              size: 20,
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: Text(
                                                state.generalError!,
                                                style: const TextStyle(
                                                  fontSize: 13.5,
                                                  fontWeight: FontWeight.w600,
                                                  color: AppTheme.errorRed,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                    ],

                                    // Email Field
                                    Semantics(
                                      label: "Email input field",
                                      child: ShakeWidget(
                                        key: _emailShakeKey,
                                        child: EmailTextField(
                                          controller: _emailController,
                                          focusNode: _emailFocusNode,
                                          errorText: state.emailError,
                                          enabled: !state.isLoading,
                                          onSubmitted: (_) {
                                            FocusScope.of(context)
                                                .requestFocus(_passwordFocusNode);
                                          },
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 18),

                                    // Password Field
                                    Semantics(
                                      label: "Password input field",
                                      child: ShakeWidget(
                                        key: _passwordShakeKey,
                                        child: PasswordTextField(
                                          controller: _passwordController,
                                          focusNode: _passwordFocusNode,
                                          isObscured: !state.isPasswordVisible,
                                          onToggleVisibility:
                                              _controller.togglePasswordVisibility,
                                          errorText: state.passwordError,
                                          enabled: !state.isLoading,
                                          onSubmitted: (_) => _onLoginPressed(),
                                        ),
                                      ),
                                    ),

                                    // Forgot Password Link
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: Semantics(
                                        button: true,
                                        label: "Forgot Password link",
                                        child: TextButton(
                                          onPressed: state.isLoading
                                              ? null
                                              : _onForgotPasswordPressed,
                                          style: TextButton.styleFrom(
                                            padding:
                                                const EdgeInsets.symmetric(vertical: 12),
                                            minimumSize: const Size(48, 48),
                                            tapTargetSize:
                                                MaterialTapTargetSize.shrinkWrap,
                                          ),
                                          child: const Text(
                                            "Forgot Password?",
                                            style: TextStyle(
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.w600,
                                              color: AppTheme.lavenderPrimary,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 16),

                                    // Continue Login Button
                                    Semantics(
                                      button: true,
                                      label: "Continue Login Button",
                                      child: LoginButton(
                                        onPressed:
                                            state.isLoading ? null : _onLoginPressed,
                                        isLoading: state.isLoading,
                                      ),
                                    ),
                                    const SizedBox(height: 22),

                                    // OR Divider
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
                                          padding:
                                              EdgeInsets.symmetric(horizontal: 12),
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

                                    // Google Login Button (Connected to GoogleAuthService & Token Exchange)
                                    Semantics(
                                      button: true,
                                      label: "Continue with Google Button",
                                      child: GoogleLoginButton(
                                        onPressed: state.isLoading
                                            ? null
                                            : _onGoogleLoginPressed,
                                        isLoading: state.isLoading,
                                      ),
                                    ),
                                    const SizedBox(height: 26),

                                    // Footer
                                    Semantics(
                                      button: true,
                                      label: "Create Account Link",
                                      child: AuthFooter(
                                        onCreateAccountTap: state.isLoading
                                            ? null
                                            : _onCreateAccountPressed,
                                      ),
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
      ),
    );
  }
}
