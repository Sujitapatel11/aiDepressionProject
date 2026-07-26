import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../models/onboarding_item.dart';
import 'onboarding_illustrations.dart';

/// Single presentational onboarding page item rendering vector artwork, headline, and description
class OnboardingPageItem extends StatelessWidget {
  final OnboardingItem item;

  const OnboardingPageItem({
    Key? key,
    required this.item,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Custom Vector Breathing Illustration
          OnboardingIllustrationWidget(
            pageIndex: item.index,
            size: 160,
          ),
          const SizedBox(height: 36),

          // Headline
          Semantics(
            header: true,
            label: "Onboarding Page ${item.index + 1}: ${item.title}",
            child: Text(
              item.title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                height: 1.25,
                letterSpacing: -0.6,
                color: isDark ? Colors.white : AppTheme.textMain,
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Supporting Body Text
          Text(
            item.description,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 15,
              height: 1.5,
              color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
              fontWeight: FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}
