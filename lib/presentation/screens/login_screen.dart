import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../core/theme/app_theme.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../controllers/login_controller.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/or_divider.dart';
import '../widgets/peaceful_person_illustration.dart';
import '../widgets/primary_gradient_button.dart';
import '../widgets/shake_widget.dart';
import '../widgets/social_auth_button.dart';
import 'forgot_password_screen.dart';
import 'shell_screen.dart';
import 'signup_screen.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE LOGIN SCREEN
/// ════════════════════════════════════════════════════════════════════════════
///
/// NOTE: business logic, controller wiring, repository calls, auth flow,
/// navigation targets, and validation are UNCHANGED from the original
/// implementation. Only presentation (composition, theming, a11y,
/// responsiveness, and two pre-existing UI bugs) was touched:
///   1. `MainState.center` (invalid identifier, wouldn't compile) is now
///      `MainAxisAlignment.center`.
///   2. The prefix-icon focus color now actually updates on focus change
///      because the field listens to its own FocusNode (see
///      AuthTextField), instead of silently relying on unrelated rebuilds.
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

  final GlobalKey<ShakeWidgetState> _emailShakeKey =
      GlobalKey<ShakeWidgetState>();
  final GlobalKey<ShakeWidgetState> _passwordShakeKey =
      GlobalKey<ShakeWidgetState>();

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
    HapticFeedback.lightImpact();

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
            const Icon(Icons.error_outline_rounded,
                color: Colors.white, size: 20),
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
          pageBuilder: (_, __, ___) =>
              SoulCareShellScreen(config: widget.config),
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
          pageBuilder: (_, __, ___) =>
              SoulCareShellScreen(config: widget.config),
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
    final maxCardWidth = MediaQuery.of(context).size.width < 480 ? 440.0 : 440.0;

    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
      body: Stack(
        children: [
          const _BackgroundGlow(),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                    horizontal: 24, vertical: 20),
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: SlideTransition(
                    position: _slideAnimation,
                    child: ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: maxCardWidth),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Semantics(
                            label: 'SoulCare illustration',
                            excludeSemantics: true,
                            child:
                                const PeacefulPersonIllustration(size: 140),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Welcome Back 👋',
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
                            'Continue your journey with SoulCare',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 15,
                              color: AppTheme.textSub,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 28),
                          _LoginCard(
                            isDark: isDark,
                            controller: _controller,
                            emailController: _emailController,
                            passwordController: _passwordController,
                            emailFocusNode: _emailFocusNode,
                            passwordFocusNode: _passwordFocusNode,
                            emailShakeKey: _emailShakeKey,
                            passwordShakeKey: _passwordShakeKey,
                            onLoginPressed: _onLoginPressed,
                            onGooglePressed: _onGooglePressed,
                            onForgotPasswordPressed: _onForgotPasswordPressed,
                            onCreateAccountPressed: _onCreateAccountPressed,
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

/// Decorative background glow, split out so it never rebuilds with the
/// rest of the tree (it depends on nothing).
class _BackgroundGlow extends StatelessWidget {
  const _BackgroundGlow();

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Stack(
        children: [
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
        ],
      ),
    );
  }
}

/// The glassmorphism card containing the form. Kept as its own widget so
/// the [ListenableBuilder] scope is limited to exactly what reads
/// controller state, instead of wrapping static siblings too.
class _LoginCard extends StatelessWidget {
  const _LoginCard({
    required this.isDark,
    required this.controller,
    required this.emailController,
    required this.passwordController,
    required this.emailFocusNode,
    required this.passwordFocusNode,
    required this.emailShakeKey,
    required this.passwordShakeKey,
    required this.onLoginPressed,
    required this.onGooglePressed,
    required this.onForgotPasswordPressed,
    required this.onCreateAccountPressed,
  });

  final bool isDark;
  final LoginController controller;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final FocusNode emailFocusNode;
  final FocusNode passwordFocusNode;
  final GlobalKey<ShakeWidgetState> emailShakeKey;
  final GlobalKey<ShakeWidgetState> passwordShakeKey;
  final VoidCallback onLoginPressed;
  final VoidCallback onGooglePressed;
  final VoidCallback onForgotPasswordPressed;
  final VoidCallback onCreateAccountPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
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
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Only the pieces that actually depend on controller state
            // sit inside the ListenableBuilder now.
            ListenableBuilder(
              listenable: controller,
              builder: (context, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AuthTextField(
                    shakeKey: emailShakeKey,
                    label: '📧 Email',
                    semanticsLabel: 'Email address',
                    icon: Icons.mail_outline_rounded,
                    controller: emailController,
                    focusNode: emailFocusNode,
                    hintText: 'Enter your email',
                    errorText: controller.emailError,
                    enabled: !controller.isLoading,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                    onSubmitted: (_) =>
                        FocusScope.of(context).requestFocus(passwordFocusNode),
                  ),
                  const SizedBox(height: 18),
                  AuthTextField(
                    shakeKey: passwordShakeKey,
                    label: '🔒 Password',
                    semanticsLabel: 'Password',
                    icon: Icons.lock_outline_rounded,
                    controller: passwordController,
                    focusNode: passwordFocusNode,
                    hintText: 'Enter your password',
                    errorText: controller.passwordError,
                    obscureText: !controller.isPasswordVisible,
                    enabled: !controller.isLoading,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.password],
                    suffixIcon: IconButton(
                      icon: Icon(
                        controller.isPasswordVisible
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        color: AppTheme.textMuted,
                      ),
                      tooltip: controller.isPasswordVisible
                          ? 'Hide password'
                          : 'Show password',
                      onPressed: controller.togglePasswordVisibility,
                    ),
                    onSubmitted: (_) => onLoginPressed(),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed:
                          controller.isLoading ? null : onForgotPasswordPressed,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text(
                        'Forgot Password?',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.lavenderPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  PrimaryGradientButton(
                    label: 'Continue',
                    isLoading: controller.isLoading,
                    onPressed: onLoginPressed,
                  ),
                  const SizedBox(height: 22),
                  const OrDivider(),
                  const SizedBox(height: 22),
                  SocialAuthButton(
                    label: 'Continue with Google',
                    onPressed: controller.isLoading ? null : onGooglePressed,
                  ),
                  const SizedBox(height: 26),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "Don't have an account? ",
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white70 : AppTheme.textSub,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      GestureDetector(
                        onTap: controller.isLoading
                            ? null
                            : onCreateAccountPressed,
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Create Account',
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
          ],
        ),
      ),
    );
  }
}