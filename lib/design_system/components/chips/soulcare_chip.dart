import 'package:flutter/material.dart';
import '../../colors/app_colors.dart';
import '../../radius/app_radius.dart';
import '../../spacing/app_spacing.dart';
import '../../typography/app_typography.dart';

/// Reusable Chip & Badge Component for SoulCare Design System.
/// Supports Mood Score Chips, Category Tags, Filter Chips, and Status Badges.
class SoulCareChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final VoidCallback? onTap;
  final bool isSelected;

  const SoulCareChip({
    Key? key,
    required this.label,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.onTap,
    this.isSelected = false,
  }) : super(key: key);

  /// Factory constructor for Mood Rating Chip (Rating scale 1 to 5)
  factory SoulCareChip.mood({
    Key? key,
    required int rating,
    required String label,
    VoidCallback? onTap,
    bool isSelected = false,
  }) {
    final Color moodColor = AppColors.getMoodColor(rating);
    return SoulCareChip(
      key: key,
      label: label,
      backgroundColor: moodColor.withOpacity(0.18),
      textColor: moodColor,
      onTap: onTap,
      isSelected: isSelected,
    );
  }

  /// Factory constructor for Category Tag Chip
  factory SoulCareChip.tag({
    Key? key,
    required String label,
    IconData? icon,
    VoidCallback? onTap,
  }) {
    return SoulCareChip(
      key: key,
      label: label,
      icon: icon,
      onTap: onTap,
    );
  }

  /// Factory constructor for Online / Available Status Badge
  factory SoulCareChip.status({
    Key? key,
    required bool isOnline,
    String? customLabel,
  }) {
    final Color statusColor = isOnline ? AppColors.successGreen : AppColors.textMutedLight;
    return SoulCareChip(
      key: key,
      label: customLabel ?? (isOnline ? "Available" : "Offline"),
      backgroundColor: statusColor.withOpacity(0.15),
      textColor: statusColor,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final Color effectiveBg = isSelected
        ? colorScheme.primary
        : (backgroundColor ?? colorScheme.primaryContainer);
    final Color effectiveFg = isSelected
        ? colorScheme.onPrimary
        : (textColor ?? colorScheme.onPrimaryContainer);

    Widget chipContent = Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: effectiveBg,
        borderRadius: AppRadius.pill,
        border: isSelected
            ? Border.all(color: colorScheme.primary, width: 1.5)
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: effectiveFg),
            AppSpacing.gapH6 ?? const SizedBox(width: 6),
          ],
          Text(
            label,
            style: AppTypography.labelMedium.copyWith(
              color: effectiveFg,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
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
