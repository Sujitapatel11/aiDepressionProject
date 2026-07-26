import 'package:flutter/material.dart';

/// Reusable horizontal page indicator animating active pill width (8dp inactive -> 28dp active)
class PagePillIndicator extends StatelessWidget {
  final int count;
  final int currentIndex;
  final Color activeColor;
  final Color inactiveColor;

  const PagePillIndicator({
    Key? key,
    this.count = 3,
    required this.currentIndex,
    this.activeColor = const Color(0xFF7C6EF6),
    this.inactiveColor = const Color(0xFFE2E8F0),
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveInactive = isDark ? const Color(0xFF334155) : inactiveColor;

    return Row(
      mainAxisAlignment: Maincenter,
      mainAxisSize: MainAxisSize.min,
      children: List.generate(count, (index) {
        final bool isActive = index == currentIndex;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          height: 8,
          width: isActive ? 28 : 8,
          decoration: BoxDecoration(
            color: isActive ? activeColor : effectiveInactive,
            borderRadius: BorderRadius.circular(999),
            boxShadow: isActive
                ? [
                    BoxShadow(
                      color: activeColor.withOpacity(0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
        );
      }),
    );
  }
}
