import 'package:flutter/material.dart';
import '../../radius/app_radius.dart';
import '../../spacing/app_spacing.dart';
import '../../typography/app_typography.dart';

/// Reusable Modal Bottom Sheet Component for SoulCare Design System.
/// Provides drag handles, title headers, close buttons, and responsive keyboard padding.
class SoulCareBottomSheet extends StatelessWidget {
  final String title;
  final Widget child;
  final List<Widget>? actions;

  const SoulCareBottomSheet({
    Key? key,
    required this.title,
    required this.child,
    this.actions,
  }) : super(key: key);

  /// Helper static method to show the bottom sheet modally
  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    required Widget child,
    List<Widget>? actions,
    bool isScrollControlled = true,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: isScrollControlled,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SoulCareBottomSheet(
        title: title,
        actions: actions,
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final mediaQuery = MediaQuery.of(context);

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: AppRadius.topSheetLarge,
      ),
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 16,
        bottom: mediaQuery.viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: colorScheme.outline,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          AppSpacing.gapV16,
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.headlineSmall.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 22),
                color: colorScheme.onSurfaceVariant,
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          AppSpacing.gapV16,
          Flexible(child: SingleChildScrollView(child: child)),
          if (actions != null) ...[
            AppSpacing.gapV24,
            Row(
              children: actions!,
            ),
          ],
        ],
      ),
    );
  }
}
