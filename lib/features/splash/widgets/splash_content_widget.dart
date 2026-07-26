import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../onboarding/widgets/onboarding_illustrations.dart';

/// Presentational widget rendering Splash Screen logo, vector illustration, tagline, and progress baseline
class SplashContentWidget extends StatelessWidget {
  final Animation<double> logoScale;
  final Animation<double> logoFade;

  const SplashContentWidget({
    Key? key,
    required this.logoScale,
    required this.logoFade,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Spacer(flex: 2),

        // 🧘 Breathing Peaceful Person Vector Artwork
        const OnboardingIllustrationWidget(
          pageIndex: 0,
          size: 160,
        ),
        const SizedBox(height: 28),

        // Brand Logo & Title with Fade & Scale Animation
        FadeTransition(
          opacity: logoFade,
          child: ScaleTransition(
            scale: logoScale,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(
                      Icons.spa_rounded,
                      color: AppTheme.lavenderPrimary,
                      size: 36,
                    ),
                    SizedBox(width: 10),
                    Text(
                      "SoulCare",
                      style: TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.lavenderPrimary,
                        letterSpacing: -0.8,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Tagline
                Text(
                  "Your sanctuary for emotional growth",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w500,
                    color: isDark
                        ? const Color(0xFF94A3B8)
                        : AppTheme.textSub,
                  ),
                ),
              ],
            ),
          ),
        ),

        const Spacer(flex: 2),

        // Minimal Progress Baseline Indicator
        SizedBox(
          width: 36,
          height: 3,
          child: LinearProgressIndicator(
            backgroundColor: isDark
                ? const Color(0xFF334155)
                : const Color(0xFFE2E8F0),
            valueColor: const AlwaysStoppedAnimation<Color>(
              AppTheme.lavenderPrimary,
            ),
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        const SizedBox(height: 36),
      ],
    );
  }
}
