import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../presentation/widgets/shake_widget.dart';

import '../controllers/reset_password_controller.dart';
import '../providers/auth_providers.dart';
import '../../widgets/auth_card.dart';
import '../../widgets/auth_header.dart';
import '../../widgets/confirm_password_text_field.dart';
import '../../widgets/new_password_text_field.dart';
import '../../widgets/password_strength_indicator.dart';
import '../../widgets/reset_password_button.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE RESET PASSWORD SCREEN (PRODUCTION CLEAN ARCHITECTURE)
/// ════════════════════════════════════════════════════════════════════════════

class SoulCareResetPasswordScreenFeature extends StatefulWidget {
  final AppConfig config;
  final String uid;
  final String token;

  const SoulCareResetPasswordScreenFeature({
    Key? key,
    this.config = AppConfig.local,
    required this.uid,
    required this.token,
  }) : super(key: key);

  @override
  State<SoulCareResetPasswordScreenFeature> createState() =>
      _SoulCareResetPasswordScreenFeatureState();
}

class _SoulCareResetPasswordScreenFeatureState
    extends State<SoulCareResetPasswordScreenFeature>
    with SingleTickerProviderStateMixin {
  late final ResetPasswordController _controller;

  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  final FocusNode _newPasswordFocusNode = FocusNode();
  final FocusNode _confirmPasswordFocusNode = FocusNode();

  final GlobalKey<ShakeWidgetState> _passwordShakeKey = GlobalKey<ShakeWidgetState>();
  final GlobalKey<ShakeWidgetState> _confirmPasswordShakeKey = GlobalKey<ShakeWidgetState>();

  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();

    final repository = AuthProviders.repository(config: widget.config);
    _controller = ResetPasswordController(
      repository: repository,
      uid: widget.uid,
      token: widget.token,
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
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _newPasswordFocusNode.dispose();
    _confirmPasswordFocusNode.dispose();
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onResetPressed() async {
    if (_controller.state.isLoading) return;
    FocusScope.of(context).unfocus();

    final success = await _controller.resetPassword(
      newPassword: _newPasswordController.text,
      confirmPassword: _confirmPasswordController.text,
    );

    if (!success) {
      HapticFeedback.vibrate();
      if (_controller.state.passwordError != null) {
        _passwordShakeKey.currentState?.shake();
      }
      if (_controller.state.confirmPasswordError != null) {
        _confirmPasswordShakeKey.currentState?.shake();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = _controller.state;
    final strength = _controller.calculatePasswordStrength(_newPasswordController.text);

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
                              title: "Create New Password 🔐",
                              subtitle: "Your new password must be at least 6 characters",
                            ),
                            const SizedBox(height: 24),

                            AuthCard(
                              child: state.isSuccess
                                  ? Column(
                                      children: [
                                        Container(
                                          width: 72,
                                          height: 72,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: AppTheme.mintSecondary
                                                .withOpacity(0.18),
                                          ),
                                          child: const Icon(
                                            Icons.check_circle_rounded,
                                            color: AppTheme.lavenderPrimary,
                                            size: 40,
                                          ),
                                        ),
                                        const SizedBox(height: 20),
                                        const Text(
                                          "Password Reset Success 🎉",
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: 22,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.textMain,
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        Text(
                                          "Your password has been updated successfully. You can now log in with your new credentials.",
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: 14.5,
                                            height: 1.5,
                                            color: isDark
                                                ? const Color(0xFF94A3B8)
                                                : AppTheme.textSub,
                                          ),
                                        ),
                                        const SizedBox(height: 28),
                                        SizedBox(
                                          height: 52,
                                          width: double.infinity,
                                          child: ElevatedButton(
                                            onPressed: () =>
                                                Navigator.of(context).pop(),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor:
                                                  AppTheme.lavenderPrimary,
                                              foregroundColor: Colors.white,
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(20),
                                              ),
                                            ),
                                            child: const Text(
                                              "Back to Log In",
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    )
                                  : Column(
                                      crossAxisAlignment:
                                          CrossAlignment.stretch,
                                      children: [
                                        // Inline Error Banner
                                        if (state.generalError != null) ...[
                                          Container(
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: AppTheme.errorRed
                                                  .withOpacity(0.1),
                                              borderRadius:
                                                  BorderRadius.circular(16),
                                              border: Border.all(
                                                color: AppTheme.errorRed
                                                    .withOpacity(0.3),
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

                                        // New Password Field
                                        Semantics(
                                          label: "New Password input field",
                                          child: ShakeWidget(
                                            key: _passwordShakeKey,
                                            child: NewPasswordTextField(
                                              controller: _newPasswordController,
                                              focusNode: _newPasswordFocusNode,
                                              isObscured: !state.isPasswordVisible,
                                              onToggleVisibility: _controller
                                                  .togglePasswordVisibility,
                                              errorText: state.passwordError,
                                              enabled: !state.isLoading,
                                              onSubmitted: (_) {
                                                FocusScope.of(context).requestFocus(
                                                    _confirmPasswordFocusNode);
                                              },
                                            ),
                                          ),
                                        ),

                                        // Live Password Strength Meter
                                        PasswordStrengthIndicator(
                                          strength: strength,
                                          password: _newPasswordController.text,
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
                                              onSubmitted: (_) =>
                                                  _onResetPressed(),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 24),

                                        // Reset Submit Button
                                        Semantics(
                                          button: true,
                                          label: "Reset Password Button",
                                          child: ResetPasswordButton(
                                            onPressed: state.isLoading
                                                ? null
                                                : _onResetPressed,
                                            isLoading: state.isLoading,
                                          ),
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
