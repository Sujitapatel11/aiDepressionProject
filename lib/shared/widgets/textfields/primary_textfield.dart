import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Primary Text Input Field for SoulCare.
/// Features floating label, hint text, optional prefix/suffix icons, focus outline glow, and inline error helper text.
class PrimaryTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String? labelText;
  final String? hintText;
  final String? errorText;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final TextInputType keyboardType;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;

  const PrimaryTextField({
    Key? key,
    this.controller,
    this.labelText,
    this.hintText,
    this.errorText,
    this.prefixIcon,
    this.suffixIcon,
    this.keyboardType = TextInputType.text,
    this.onChanged,
    this.onSubmitted,
    this.enabled = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (labelText != null) ...[
          Text(
            labelText!,
            style: AppTypography.labelLarge.copyWith(
              color: colorScheme.onSurface,
              fontWeight: FontWeight.w600,
            ),
          ),
          AppSpacing.gapV8,
        ],
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          enabled: enabled,
          onChanged: onChanged,
          onSubmitted: onSubmitted,
          style: AppTypography.bodyLarge.copyWith(color: colorScheme.onSurface),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: AppTypography.bodyMedium.copyWith(color: AppColors.textMutedLight),
            errorText: errorText,
            errorStyle: AppTypography.bodySmall.copyWith(color: colorScheme.error),
            prefixIcon: prefixIcon != null
                ? Icon(prefixIcon, color: colorScheme.onSurfaceVariant, size: 22)
                : null,
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: colorScheme.surface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
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
            errorBorder: OutlineInputBorder(
              borderRadius: AppRadius.inputField,
              borderSide: BorderSide(color: colorScheme.error, width: 1.5),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: AppRadius.inputField,
              borderSide: BorderSide(color: colorScheme.error, width: 2.0),
            ),
          ),
        ),
      ],
    );
  }
}
