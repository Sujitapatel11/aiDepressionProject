import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../presentation/screens/shell_screen.dart';
import '../../../../presentation/widgets/shake_widget.dart';

import '../controllers/session_manager.dart';
import '../controllers/signup_controller.dart';
import '../providers/auth_providers.dart';
import '../../widgets/auth_card.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/confirm_password_text_field.dart';
import '../../widgets/email_text_field.dart';
import '../../widgets/name_text_field.dart';
import '../../widgets/password_strength_indicator.dart';
import '../../widgets/password_text_field.dart';
import '../../widgets/signup_button.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE SIGNUP SCREEN (PRODUCTION CLEAN ARCHITECTURE IMPLEMENTATION)
/// ════════════════════════════════════════════════════════════════════════════

class SoulCareSignupScreenFeature extends StatefulWidget {
  final AppConfig config;

  const SoulCareSignupScreenFeature({
    Key? key,
    this.config = AppConfig.local,
  }) : super(key: key);

  @override
  State<SoulCareSignupScreenFeature> createState() =>
      _SoulCareSignupScreenFeatureState();
}

class _SoulCareSignupScreenFeatureState
    extends State<SoulCareSignupScreenFeature>
    with SingleTickerProviderStateMixin {
  late final SignupController _controller;
  late final SessionManager _sessionManager;

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  final FocusNode _nameFocusNode = FocusNode();
  final FocusNode _emailFocusNode = FocusNode();
  final FocusNode _passwordFocusNode = FocusNode();
  final FocusNode _confirmPasswordFocusNode = FocusNode();

  final GlobalKey<ShakeWidgetState> _nameShakeKey = GlobalKey<ShakeWidgetState>();
  final GlobalKey<ShakeWidgetState> _emailShakeKey = GlobalKey<ShakeWidgetState>();
  final GlobalKey<ShakeWidgetState> _passwordShakeKey = GlobalKey<ShakeWidgetState>();
  final GlobalKey<ShakeWidgetState> _confirmPasswordShakeKey = GlobalKey<ShakeWidgetState>();

  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();

    final repository = AuthProviders.repository(config: widget.config);
    final secureStorage = AuthProviders.secureStorage;

    _sessionManager = SessionManager(
      repository: repository,
      secureStorage: secureStorage,
    );

    _controller = SignupController(
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
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();

    _nameFocusNode.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    _confirmPasswordFocusNode.dispose();

    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onSignupPressed() async {
    if (_controller.state.isLoading) return;
    FocusScope.of(context).unfocus();

    final success = await _controller.signup(
      name: _nameController.text,
      email: _emailController.text,
      password: _passwordController.text,
      confirmPassword: _confirmPasswordController.text,
    );

    if (success && mounted) {
      TextInput.finishAutofillContext();
      // On success, backend issues JWT tokens -> update SessionManager -> route to Dashboard
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
      if (_controller.state.nameError != null) _nameShakeKey.currentState?.shake();
      if (_controller.state.emailError != null) _emailShakeKey.currentState?.shake();
      if (_controller.state.passwordError != null) _passwordShakeKey.currentState?.shake();
      if (_controller.state.confirmPasswordError != null) {
        _confirmPasswordShakeKey.currentState?.shake();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = _controller.state;
    final strength = _controller.calculatePasswordStrength(_passwordController.text);

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
                            const AuthHeader(
                              title: "Begin Your Journey ✨",
                              subtitle: "Create your private SoulCare account",
                            ),
                            const SizedBox(height: 24),

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

                                    // Full Name Field
                                    Semantics(
                                      label: "Full Name input field",
                                      child: ShakeWidget(
                                        key: _nameShakeKey,
                                        child: NameTextField(
                                          controller: _nameController,
                                          focusNode: _nameFocusNode,
                                          errorText: state.nameError,
                                          enabled: !state.isLoading,
                                          onSubmitted: (_) {
                                            FocusScope.of(context)
                                                .requestFocus(_emailFocusNode);
                                          },
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 16),

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
                                    const SizedBox(height: 16),

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
                                          onSubmitted: (_) {
                                            FocusScope.of(context).requestFocus(
                                                _confirmPasswordFocusNode);
                                          },
                                        ),
                                      ),
                                    ),

                                    // Live Password Strength Indicator
                                    PasswordStrengthIndicator(
                                      strength: strength,
                                      password: _passwordController.text,
                                    ),
                                    const SizedBox(height: 16),

                                    // Confirm Password Field
                                    Semantics(
                                      label: "Confirm Password input field",
                                      child: ShakeWidget(
                                        key: _confirmPasswordShakeKey,
                                        child: ConfirmPasswordTextField(
                                          controller: _confirmPasswordController,
                                          focusNode: _confirmPasswordFocusNode,
                                          isObscured:
                                              !state.isConfirmPasswordVisible,
                                          onToggleVisibility: _controller
                                              .toggleConfirmPasswordVisibility,
                                          errorText: state.confirmPasswordError,
                                          enabled: !state.isLoading,
                                          onSubmitted: (_) => _onSignupPressed(),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 24),

                                    // Signup Submit Button
                                    Semantics(
                                      button: true,
                                      label: "Create Account Button",
                                      child: SignupButton(
                                        onPressed:
                                            state.isLoading ? null : _onSignupPressed,
                                        isLoading: state.isLoading,
                                      ),
                                    ),
                                    const SizedBox(height: 20),

                                    // Return to Login Link
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          "Already have an account? ",
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: isDark
                                                ? Colors.white70
                                                : AppTheme.textSub,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        GestureDetector(
                                          onTap: state.isLoading
                                              ? null
                                              : () => Navigator.of(context).pop(),
                                          child: const Text(
                                            "Log In",
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: AppTheme.lavenderPrimary,
                                              fontWeight: FontWeight.bold,
                                            ),
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
      ),
    );
  }
}
