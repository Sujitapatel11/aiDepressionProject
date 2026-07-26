import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../presentation/widgets/shake_widget.dart';

import '../controllers/forgot_password_controller.dart';
import '../providers/auth_providers.dart';
import '../../widgets/auth_card.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/email_text_field.dart';
import '../../widgets/send_reset_button.dart';
import '../../widgets/success_state_card.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE FORGOT PASSWORD SCREEN (PRODUCTION CLEAN ARCHITECTURE)
/// ════════════════════════════════════════════════════════════════════════════

class SoulCareForgotPasswordScreenFeature extends StatefulWidget {
  final AppConfig config;
  final String initialEmail;

  const SoulCareForgotPasswordScreenFeature({
    Key? key,
    this.config = AppConfig.local,
    this.initialEmail = '',
  }) : super(key: key);

  @override
  State<SoulCareForgotPasswordScreenFeature> createState() =>
      _SoulCareForgotPasswordScreenFeatureState();
}

class _SoulCareForgotPasswordScreenFeatureState
    extends State<SoulCareForgotPasswordScreenFeature>
    with SingleTickerProviderStateMixin {
  late final ForgotPasswordController _controller;
  late final TextEditingController _emailController;
  final FocusNode _emailFocusNode = FocusNode();
  final GlobalKey<ShakeWidgetState> _emailShakeKey = GlobalKey<ShakeWidgetState>();

  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();

    _emailController = TextEditingController(text: widget.initialEmail);

    final repository = AuthProviders.repository(config: widget.config);
    _controller = ForgotPasswordController(repository: repository);
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
    _emailFocusNode.dispose();
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onSendResetPressed() {
    if (_controller.state.isLoading) return;
    FocusScope.of(context).unfocus();

    _controller.sendPasswordReset(_emailController.text);

    if (_controller.state.emailError != null) {
      HapticFeedback.vibrate();
      _emailShakeKey.currentState?.shake();
    }
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
                              title: "Reset Password 🔑",
                              subtitle:
                                  "Enter your account email to receive reset instructions",
                            ),
                            const SizedBox(height: 24),

                            AuthCard(
                              child: state.isSubmitted
                                  ? SuccessStateCard(
                                      email: _emailController.text,
                                      onReturnToLogin: () =>
                                          Navigator.of(context).pop(),
                                    )
                                  : Column(
                                      crossAxisAlignment:
                                          CrossAlignment.stretch,
                                      children: [
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
                                              onSubmitted: (_) =>
                                                  _onSendResetPressed(),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 24),

                                        // Submit Reset Button
                                        Semantics(
                                          button: true,
                                          label: "Send Reset Link Button",
                                          child: SendResetButton(
                                            onPressed: state.isLoading
                                                ? null
                                                : _onSendResetPressed,
                                            isLoading: state.isLoading,
                                          ),
                                        ),
                                        const SizedBox(height: 20),

                                        // Back to Login Link
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          children: [
                                            GestureDetector(
                                              onTap: state.isLoading
                                                  ? null
                                                  : () =>
                                                      Navigator.of(context).pop(),
                                              child: const Text(
                                                "← Back to Log In",
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
