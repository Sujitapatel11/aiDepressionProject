import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Multi-line Text Area for SoulCare Reflection Journal entries.
class MultilineTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String labelText;
  final String hintText;
  final String? errorText;
  final int maxLines;
  final ValueChanged<String>? onChanged;

  const MultilineTextField({
    Key? key,
    this.controller,
    this.labelText = "Reflection Content",
    this.hintText = "Express your thoughts freely...",
    this.errorText,
    this.maxLines = 4,
    this.onChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          labelText,
          style: AppTypography.labelLarge.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w600,
          ),
        ),
        AppSpacing.gapV8,
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: TextInputType.multiline,
          onChanged: onChanged,
          style: AppTypography.bodyLarge.copyWith(color: colorScheme.onSurface),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: AppTypography.bodyMedium.copyWith(color: AppColors.textMutedLight),
            errorText: errorText,
            errorStyle: AppTypography.bodySmall.copyWith(color: colorScheme.error),
            filled: true,
            fillColor: colorScheme.surface,
            contentPadding: const EdgeInsets.all(20),
            border: OutlineInputBorder(
              borderRadius: AppRadius.inputField,
              borderSide: BorderSide(color: colorScheme.outline, width: 1.2),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: AppRadius.inputField,
              borderSide: BorderSide(color: colorScheme.outline, width: 1.2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: AppRadius.inputField,
              borderSide: BorderSide(color: colorScheme.primary, width: 2.0),
            ),
          ),
        ),
      ],
    );
  }
}
