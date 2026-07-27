import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';
import 'app_card.dart';

/// Mood Check-In & Trajectory Card Component for SoulCare.
/// Color scales automatically according to mood rating score (1 to 5).
class MoodCard extends StatelessWidget {
  final int rating;
  final String moodLabel;
  final String dateText;
  final String? note;
  final VoidCallback? onTap;

  const MoodCard({
    Key? key,
    required this.rating,
    required this.moodLabel,
    required this.dateText,
    this.note,
    this.onTap,
  }) : super(key: key);

  IconData get _moodIcon {
    switch (rating) {
      case 1:
        return AppIcons.moodVeryBad;
      case 2:
        return AppIcons.moodBad;
      case 3:
        return AppIcons.moodNeutral;
      case 4:
        return AppIcons.moodGood;
      case 5:
        return AppIcons.moodVeryGood;
      default:
        return AppIcons.moodNeutral;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final moodColor = AppColors.getMoodColor(rating);

    return AppCard(
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: moodColor.withOpacity(0.18),
              shape: BoxShape.circle,
            ),
            child: Icon(_moodIcon, size: 28, color: moodColor),
          ),
          AppSpacing.gapH16,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      moodLabel,
                      style: AppTypography.titleMedium.copyWith(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      dateText,
                      style: AppTypography.bodySmall.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                if (note != null && note!.isNotEmpty) ...[
                  AppSpacing.gapV4,
                  Text(
                    note!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.bodyMedium.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
