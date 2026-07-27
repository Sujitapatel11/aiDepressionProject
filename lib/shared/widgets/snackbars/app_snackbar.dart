import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

enum AppSnackBarType { success, error, info, warning }

/// Floating Feedback SnackBar Helper for SoulCare (Success, Error, Info, Warning).
abstract class AppSnackBar {
  static void show({
    required BuildContext context,
    required String message,
    AppSnackBarType type = AppSnackBarType.info,
    Duration duration = const Duration(seconds: 4),
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    Color bg;
    Color fg = Colors.white;
    IconData icon;

    switch (type) {
      case AppSnackBarType.success:
        bg = AppColors.successGreen;
        icon = Icons.check_circle_outline_rounded;
        break;
      case AppSnackBarType.error:
        bg = colorScheme.error;
        icon = Icons.error_outline_rounded;
        break;
      case AppSnackBarType.warning:
        bg = AppColors.warningAmber;
        icon = Icons.warning_amber_rounded;
        break;
      case AppSnackBarType.info:
        bg = colorScheme.primary;
        icon = Icons.info_outline_rounded;
        break;
    }

    final snackBar = SnackBar(
      content: Row(
        children: [
          Icon(icon, color: fg, size: 22),
          AppSpacing.gapH12,
          Expanded(
            child: Text(
              message,
              style: AppTypography.bodyMedium.copyWith(
                color: fg,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      backgroundColor: bg,
      behavior: SnackBarBehavior.floating,
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.medium),
      margin: const EdgeInsets.all(16),
      duration: duration,
    );

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(snackBar);
  }
}
