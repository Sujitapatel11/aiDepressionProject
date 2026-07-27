import 'package:flutter/material.dart';
import '../../colors/app_colors.dart';
import '../../radius/app_radius.dart';
import '../../spacing/app_spacing.dart';
import '../../typography/app_typography.dart';

/// Reusable Input Field Component for SoulCare Design System.
/// Supports standard text input, password fields with eye toggle, multi-line text areas, and search inputs.
class SoulCareTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String? labelText;
  final String? hintText;
  final String? errorText;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final bool isPassword;
  final int maxLines;
  final TextInputType keyboardType;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;

  const SoulCareTextField({
    Key? key,
    this.controller,
    this.labelText,
    this.hintText,
    this.errorText,
    this.prefixIcon,
    this.suffixIcon,
    this.isPassword = false,
    this.maxLines = 1,
    this.keyboardType = TextInputType.text,
    this.onChanged,
    this.onSubmitted,
    this.enabled = true,
  }) : super(key: key);

  /// Factory constructor for Password Input Field with built-in eye toggle
  factory SoulCareTextField.password({
    Key? key,
    TextEditingController? controller,
    String labelText = "Password",
    String hintText = "Enter your password",
    String? errorText,
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onSubmitted,
  }) {
    return SoulCareTextField(
      key: key,
      controller: controller,
      labelText: labelText,
      hintText: hintText,
      errorText: errorText,
      prefixIcon: Icons.lock_outline_rounded,
      isPassword: true,
      keyboardType: TextInputType.visiblePassword,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
    );
  }

  /// Factory constructor for Multi-line Reflection Journal Text Area
  factory SoulCareTextField.textArea({
    Key? key,
    TextEditingController? controller,
    String labelText = "Reflection Content",
    String hintText = "Express your thoughts freely...",
    String? errorText,
    int maxLines = 4,
    ValueChanged<String>? onChanged,
  }) {
    return SoulCareTextField(
      key: key,
      controller: controller,
      labelText: labelText,
      hintText: hintText,
      errorText: errorText,
      maxLines: maxLines,
      keyboardType: TextInputType.multiline,
      onChanged: onChanged,
    );
  }

  /// Factory constructor for Search Bar Input Field
  factory SoulCareTextField.search({
    Key? key,
    TextEditingController? controller,
    String hintText = "Search reflections, topics, community...",
    ValueChanged<String>? onChanged,
    VoidCallback? onClear,
  }) {
    return SoulCareTextField(
      key: key,
      controller: controller,
      hintText: hintText,
      prefixIcon: Icons.search_rounded,
      suffixIcon: controller != null && controller.text.isNotEmpty
          ? IconButton(
              icon: const Icon(Icons.clear_rounded, size: 20),
              onPressed: () {
                controller.clear();
                if (onClear != null) onClear();
              },
            )
          : null,
      onChanged: onChanged,
    );
  }

  @override
  State<SoulCareTextField> createState() => _SoulCareTextFieldState();
}

class _SoulCareTextFieldState extends State<SoulCareTextField> {
  bool _obscureText = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    Widget? effectiveSuffixIcon = widget.suffixIcon;

    if (widget.isPassword) {
      effectiveSuffixIcon = IconButton(
        icon: Icon(
          _obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
          color: colorScheme.onSurfaceVariant,
          size: 22,
        ),
        onPressed: () {
          setState(() {
            _obscureText = !_obscureText;
          });
        },
      );
    }

    return Column(
      crossAxisAlignment: CrossAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.labelText != null) ...[
          Text(
            widget.labelText!,
            style: AppTypography.labelLarge.copyWith(
              color: colorScheme.onSurface,
              fontWeight: FontWeight.w600,
            ),
          ),
          AppSpacing.gapV8,
        ],
        TextField(
          controller: widget.controller,
          obscureText: widget.isPassword ? _obscureText : false,
          maxLines: widget.isPassword ? 1 : widget.maxLines,
          keyboardType: widget.keyboardType,
          enabled: widget.enabled,
          onChanged: widget.onChanged,
          onSubmitted: widget.onSubmitted,
          style: AppTypography.bodyLarge.copyWith(color: colorScheme.onSurface),
          decoration: InputDecoration(
            hintText: widget.hintText,
            hintStyle: AppTypography.bodyMedium.copyWith(color: AppColors.textMutedLight),
            errorText: widget.errorText,
            errorStyle: AppTypography.bodySmall.copyWith(color: colorScheme.error),
            prefixIcon: widget.prefixIcon != null
                ? Icon(widget.prefixIcon, color: colorScheme.onSurfaceVariant, size: 22)
                : null,
            suffixIcon: effectiveSuffixIcon,
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
