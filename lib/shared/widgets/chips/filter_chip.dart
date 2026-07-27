import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Selectable Filter Chip Component for SoulCare.
class AppFilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final ValueChanged<bool> onSelected;

  const AppFilterChip({
    Key? key,
    required this.label,
    required this.isSelected,
    required this.onSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: onSelected,
      selectedColor: colorScheme.primary,
      backgroundColor: colorScheme.surface,
      checkmarkColor: colorScheme.onPrimary,
      labelStyle: AppTypography.labelMedium.copyWith(
        color: isSelected ? colorScheme.onPrimary : colorScheme.onSurface,
        fontWeight: FontWeight.w600,
      ),
      shape: const StadiumBorder(),
      side: BorderSide(
        color: isSelected ? colorScheme.primary : colorScheme.outline,
        width: 1.2,
      ),
    );
  }
}
