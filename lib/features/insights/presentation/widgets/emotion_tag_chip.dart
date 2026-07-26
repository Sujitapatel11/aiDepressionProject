import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Reusable chip widget displaying emotion tags returned by AI Engine backend
class EmotionTagChip extends StatelessWidget {
  final String tag;

  const EmotionTagChip({
    Key? key,
    required this.tag,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.lavenderPrimary.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.lavenderPrimary.withOpacity(0.3),
        ),
      ),
      child: Text(
        "#$tag",
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: isDark ? AppTheme.lavenderSecondary : AppTheme.lavenderPrimary,
        ),
      ),
    );
  }
}
