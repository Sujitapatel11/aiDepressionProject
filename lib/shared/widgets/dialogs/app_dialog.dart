import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Standard Material 3 Container Alert Dialog for SoulCare.
class AppDialog extends StatelessWidget {
  final String title;
  final String content;
  final List<Widget>? actions;

  const AppDialog({
    Key? key,
    required this.title,
    required this.content,
    this.actions,
  }) : super(key: key);

  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    required String content,
    List<Widget>? actions,
  }) {
    return showDialog<T>(
      context: context,
      builder: (ctx) => AppDialog(
        title: title,
        content: content,
        actions: actions,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return AlertDialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.large),
      backgroundColor: colorScheme.surface,
      title: Text(
        title,
        style: AppTypography.titleLarge.copyWith(
          color: colorScheme.onSurface,
          fontWeight: FontWeight.w700,
        ),
      ),
      content: Text(
        content,
        style: AppTypography.bodyMedium.copyWith(
          color: colorScheme.onSurfaceVariant,
        ),
      ),
      actions: actions,
    );
  }
}
