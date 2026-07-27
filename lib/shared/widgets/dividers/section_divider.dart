import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Styled Section Divider with optional text label (e.g. "or continue with").
class SectionDivider extends StatelessWidget {
  final String? label;
  final double thickness;
  final EdgeInsetsGeometry margin;

  const SectionDivider({
    Key? key,
    this.label,
    this.thickness = 1.2,
    this.margin = const EdgeInsets.symmetric(vertical: 20),
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    if (label == null || label!.isEmpty) {
      return Padding(
        padding: margin,
        child: Divider(
          thickness: thickness,
          color: colorScheme.outline,
        ),
      );
    }

    return Padding(
      padding: margin,
      child: Row(
        children: [
          Expanded(child: Divider(thickness: thickness, color: colorScheme.outline)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              label!,
              style: AppTypography.labelMedium.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(child: Divider(thickness: thickness, color: colorScheme.outline)),
        ],
      ),
    );
  }
}
