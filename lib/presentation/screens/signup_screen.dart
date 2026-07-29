import 'package:flutter/material.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../core/theme/app_theme.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../controllers/login_controller.dart';
import '../widgets/mascot_widget.dart';
import '../widgets/primary_gradient_button.dart';
import '../widgets/shake_widget.dart';
import 'shell_screen.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE REDESIGNED SIGNUP SCREEN (PLAYFUL & FRIENDLY UI)
/// ════════════════════════════════════════════════════════════════════════════

class SignupScreen extends StatefulWidget {
  final AppConfig config;

  const SignupScreen({
    Key? key,
    this.config = AppConfig.local,
  }) : super(key: key);

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen>
    with SingleTickerProviderStateMixin {
  late final LoginController _controller;

  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  final FocusNode _userFocusNode = FocusNode();
  final FocusNode _emailFocusNode = FocusNode();
  final FocusNode _passFocusNode = FocusNode();

  final GlobalKey<ShakeWidgetState> _shakeKey = GlobalKey<ShakeWidgetState>();

  late AnimationController _animController;
  late Animation<double> _fadeAnimation;

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
      duration: const Duration(milliseconds: 600),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );

    _animController.forward();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _userFocusNode.dispose();
    _emailFocusNode.dispose();
    _passFocusNode.dispose();
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _showErrorSnackBar(String message) {
    if (!mounted) return;
    _shakeKey.currentState?.shake();
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
        ),
        backgroundColor: AppTheme.errorRed,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }

  Future<void> _onSignupPressed() async {
    final success = await _controller.signup(
      username: _usernameController.text,
      email: _emailController.text,
      password: _passwordController.text,
      onErrorSnackBar: _showErrorSnackBar,
    );

    if (success && mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 600),
          pageBuilder: (_, __, ___) => SoulCareShellScreen(config: widget.config),
          transitionsBuilder: (_, animation, __, child) =>
              FadeTransition(opacity: animation, child: child),
        ),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: ShakeWidget(
                key: _shakeKey,
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 440),
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(32),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.lavenderPrimary.withOpacity(0.06),
                        blurRadius: 36,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Center(
                        child: SoulCareMascot(
                          size: 100,
                          mood: MascotMood.happy,
                        ),
                      ),
                      const SizedBox(height: 14),

                      Text(
                        "Join SoulCare",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : AppTheme.textMain,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        "Begin your gentle journey toward self-awareness.",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white70 : AppTheme.textSub,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Username
                      const Text(
                        "Username",
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _usernameController,
                        focusNode: _userFocusNode,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          hintText: "Choose a friendly username",
                          prefixIcon: Icon(Icons.person_outline_rounded),
                        ),
                        onSubmitted: (_) {
                          FocusScope.of(context).requestFocus(_emailFocusNode);
                        },
                      ),
                      const SizedBox(height: 16),

                      // Email
                      const Text(
                        "Email Address",
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _emailController,
                        focusNode: _emailFocusNode,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        decoration: InputDecoration(
                          hintText: "name@example.com",
                          errorText: _controller.emailError,
                          prefixIcon: const Icon(Icons.mail_outline_rounded),
                        ),
                        onSubmitted: (_) {
                          FocusScope.of(context).requestFocus(_passFocusNode);
                        },
                      ),
                      const SizedBox(height: 16),

                      // Password
                      const Text(
                        "Password",
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _passwordController,
                        focusNode: _passFocusNode,
                        obscureText: !_controller.isPasswordVisible,
                        textInputAction: TextInputAction.done,
                        decoration: InputDecoration(
                          hintText: "Create a password (6+ chars)",
                          errorText: _controller.passwordError,
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _controller.isPasswordVisible
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                            ),
                            onPressed: _controller.togglePasswordVisibility,
                          ),
                        ),
                        onSubmitted: (_) => _onSignupPressed(),
                      ),
                      const SizedBox(height: 28),

                      // Join Button
                      PrimaryGradientButton(
                        label: "Create Account",
                        height: 54,
                        isLoading: _controller.isLoading,
                        onPressed: _onSignupPressed,
                      ),
                      const SizedBox(height: 20),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text("Already have an account? "),
                          GestureDetector(
                            onTap: () => Navigator.of(context).pop(),
                            child: const Text(
                              "Log In",
                              style: TextStyle(
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
            ),
          ),
        ),
      ),
    );
  }
}