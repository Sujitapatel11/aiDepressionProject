import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Mood Score Rating Chip Component (Rating 1 to 5 scale).
class MoodChip extends StatelessWidget {
  final int rating;
  final String label;
  final bool isSelected;
  final VoidCallback? onTap;

  const MoodChip({
    Key? key,
    required this.rating,
    required this.label,
    this.isSelected = false,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final moodColor = AppColors.getMoodColor(rating);
    final colorScheme = Theme.of(context).colorScheme;

    final effectiveBg = isSelected ? moodColor : moodColor.withOpacity(0.18);
    final effectiveFg = isSelected ? Colors.white : moodColor;

    final Widget chipContent = Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: effectiveBg,
        borderRadius: AppRadius.pill,
        border: isSelected ? Border.all(color: moodColor, width: 1.5) : null,
      ),
      child: Text(
        label,
        style: AppTypography.labelMedium.copyWith(
          color: effectiveFg,
          fontWeight: FontWeight.w700,
        ),
      ),
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: chipContent,
      );
    }

    return chipContent;
  }
}
