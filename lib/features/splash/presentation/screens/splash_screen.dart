import 'package:flutter/material.dart';
import '../../../core/config/app_config.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/datasources/auth_remote_datasource.dart';
import '../../../presentation/screens/login_screen.dart';
import '../../../presentation/screens/shell_screen.dart';
import '../../onboarding/data/onboarding_local_datasource.dart';
import '../../onboarding/presentation/screens/onboarding_screen.dart';
import '../data/app_initializer_service.dart';
import '../domain/app_initializer.dart';
import '../controllers/splash_controller.dart';
import '../widgets/splash_content_widget.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE SPLASH SCREEN (ANIMATED 2200ms ENTRY + SEPARATE APP INITIALIZER)
/// ════════════════════════════════════════════════════════════════════════════

class SoulCareSplashScreen extends StatefulWidget {
  final AppConfig config;

  const SoulCareSplashScreen({
    Key? key,
    this.config = AppConfig.local,
  }) : super(key: key);

  @override
  State<SoulCareSplashScreen> createState() => _SoulCareSplashScreenState();
}

class _SoulCareSplashScreenState extends State<SoulCareSplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _logoScale;
  late Animation<double> _logoFade;

  late final SplashController _controller;

  @override
  void initState() {
    super.initState();

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _logoScale = Tween<double>(begin: 0.92, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: Curves.easeOutCubic,
      ),
    );

    _logoFade = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeIn,
    );

    _animController.forward();

    // Instantiate AppInitializer service cleanly outside the UI layer
    final onboardingDataSource = OnboardingLocalDataSource();
    final secureStorage = SecureStorageService();
    final authRemoteDataSource = AuthRemoteDataSourceImpl(config: widget.config);

    final appInitializer = AppInitializerServiceImpl(
      onboardingDataSource: onboardingDataSource,
      secureStorage: secureStorage,
      authRemoteDataSource: authRemoteDataSource,
    );

    _controller = SplashController(appInitializer: appInitializer);

    // Trigger 2200ms timeline and routing callback
    _controller.initializeSplash(onReady: _navigateDestination);
  }

  @override
  void dispose() {
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _navigateDestination(InitialDestination destination) {
    if (!mounted) return;

    Widget targetScreen;
    switch (destination) {
      case InitialDestination.onboarding:
        targetScreen = SoulCareOnboardingScreen(config: widget.config);
        break;
      case InitialDestination.dashboard:
        targetScreen = SoulCareShellScreen(config: widget.config);
        break;
      case InitialDestination.login:
      default:
        targetScreen = SoulCareLoginScreen(config: widget.config);
        break;
    }

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 600),
        pageBuilder: (_, __, ___) => targetScreen,
        transitionsBuilder: (_, animation, __, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
      body: Semantics(
        label: "SoulCare Application Loading",
        child: Stack(
          children: [
            // Ambient Radial Background Glow Accent
            Positioned(
              top: -60,
              right: -50,
              child: Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.lavenderPrimary.withOpacity(isDark ? 0.16 : 0.12),
                ),
              ),
            ),
            Positioned(
              bottom: -70,
              left: -50,
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.mintSecondary.withOpacity(isDark ? 0.16 : 0.16),
                ),
              ),
            ),

            // Main Splash Content
            SafeArea(
              child: SplashContentWidget(
                logoScale: _logoScale,
                logoFade: _logoFade,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
