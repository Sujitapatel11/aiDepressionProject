import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../onboarding/widgets/onboarding_illustrations.dart';

/// Reusable top hero header with vector illustration, title, and subtitle
class AuthHeader extends StatelessWidget {
  final String title;
  final String subtitle;

  const AuthHeader({
    Key? key,
    this.title = "Welcome Back 👋",
    this.subtitle = "Continue your journey with SoulCare",
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Vector Illustration
        const OnboardingIllustrationWidget(pageIndex: 0, size: 135),
        const SizedBox(height: 16),

        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 30,
            fontWeight: FontWeight.bold,
            color: AppTheme.textMain,
            letterSpacing: -0.6,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 15,
            color: AppTheme.textSub,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
