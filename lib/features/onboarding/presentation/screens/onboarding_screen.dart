import 'package:flutter/material.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../presentation/screens/login_screen.dart';
import '../../data/onboarding_local_datasource.dart';
import '../../data/onboarding_repository_impl.dart';
import '../../models/onboarding_item.dart';
import '../controllers/onboarding_controller.dart';
import '../widgets/onboarding_page_item.dart';
import '../widgets/page_pill_indicator.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE ONBOARDING SCREEN (3-SCREEN EXPERIENTIAL FLOW)
/// ════════════════════════════════════════════════════════════════════════════

class SoulCareOnboardingScreen extends StatefulWidget {
  final AppConfig config;

  const SoulCareOnboardingScreen({
    Key? key,
    this.config = AppConfig.local,
  }) : super(key: key);

  @override
  State<SoulCareOnboardingScreen> createState() =>
      _SoulCareOnboardingScreenState();
}

class _SoulCareOnboardingScreenState extends State<SoulCareOnboardingScreen> {
  late final PageController _pageController;
  late final OnboardingController _controller;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();

    final localDataSource = OnboardingLocalDataSource();
    final repository = OnboardingRepositoryImpl(localDataSource: localDataSource);

    _controller = OnboardingController(repository: repository);
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _pageController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _navigateToLogin() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 600),
        pageBuilder: (_, __, ___) => SoulCareLoginScreen(config: widget.config),
        transitionsBuilder: (_, animation, __, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  void _onNextPressed() {
    if (_controller.state.isLastPage) {
      _controller.completeOnboarding(onComplete: _navigateToLogin);
    } else {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  void _onSkipPressed() {
    _controller.completeOnboarding(onComplete: _navigateToLogin);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentItem = OnboardingItem.items[_controller.state.currentPageIndex];

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
      body: Stack(
        children: [
          // Ambient Radial Background Glow (Adapts per page color token)
          Positioned(
            top: -40,
            right: -40,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 500),
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: currentItem.themeColor.withOpacity(isDark ? 0.14 : 0.12),
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Top Action Bar (SoulCare Logo & Skip Button)
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: const [
                          Icon(
                            Icons.spa_rounded,
                            color: AppTheme.lavenderPrimary,
                            size: 24,
                          ),
                          SizedBox(width: 8),
                          Text(
                            "SoulCare",
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.lavenderPrimary,
                              letterSpacing: -0.4,
                            ),
                          ),
                        ],
                      ),

                      // Skip Button (Hidden on Last Page)
                      AnimatedOpacity(
                        duration: const Duration(milliseconds: 200),
                        opacity: _controller.state.isLastPage ? 0.0 : 1.0,
                        child: IgnorePointer(
                          ignoring: _controller.state.isLastPage,
                          child: TextButton(
                            onPressed: _onSkipPressed,
                            style: TextButton.styleFrom(
                              foregroundColor: isDark
                                  ? const Color(0xFF94A3B8)
                                  : AppTheme.textSub,
                            ),
                            child: const Text(
                              "Skip",
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Main PageView Page Slider
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: OnboardingItem.items.length,
                    onPageChanged: _controller.onPageChanged,
                    itemBuilder: (context, index) {
                      return OnboardingPageItem(
                        item: OnboardingItem.items[index],
                      );
                    },
                  ),
                ),

                // Bottom Navigation Control Bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
                  child: Column(
                    children: [
                      // Animated Pill Indicator
                      PagePillIndicator(
                        currentIndex: _controller.state.currentPageIndex,
                        count: 3,
                        activeColor: currentItem.themeColor,
                      ),
                      const SizedBox(height: 28),

                      // Action Button (Continue / Next / Get Started)
                      SizedBox(
                        height: 56,
                        width: double.infinity,
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
                                color: const Color(0xFF7C6EF6).withOpacity(0.35),
                                blurRadius: 16,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: ElevatedButton(
                            onPressed: _controller.state.isCompleting
                                ? null
                                : _onNextPressed,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                            child: _controller.state.isCompleting
                                ? const SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                          Colors.white),
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        currentItem.ctaText,
                                        style: const TextStyle(
                                          fontSize: 16.5,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      const Icon(
                                        Icons.arrow_forward_rounded,
                                        size: 20,
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
