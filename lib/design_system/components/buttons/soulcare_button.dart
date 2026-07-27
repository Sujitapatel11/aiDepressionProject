import 'package:flutter/material.dart';
import '../../colors/app_colors.dart';
import '../../radius/app_radius.dart';
import '../../spacing/app_spacing.dart';
import '../../typography/app_typography.dart';

/// SoulCare Button Variant Types
enum SoulCareButtonVariant { primary, secondary, outlined, text }

/// SoulCare Button Size Options
enum SoulCareButtonSize { small, medium, large }

/// Premium Reusable Button Component for SoulCare Design System.
/// Supports Primary, Secondary, Outlined, and Text variants with loading state spinners.
class SoulCareButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final SoulCareButtonVariant variant;
  final SoulCareButtonSize size;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;

  const SoulCareButton({
    Key? key,
    required this.label,
    required this.onPressed,
    this.variant = SoulCareButtonVariant.primary,
    this.size = SoulCareButtonSize.large,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = true,
  }) : super(key: key);

  /// Factory constructor for Primary Lavender Button
  factory SoulCareButton.primary({
    required String label,
    required VoidCallback? onPressed,
    SoulCareButtonSize size = SoulCareButtonSize.large,
    IconData? icon,
    bool isLoading = false,
    bool isFullWidth = true,
  }) {
    return SoulCareButton(
      label: label,
      onPressed: onPressed,
      variant: SoulCareButtonVariant.primary,
      size: size,
      icon: icon,
      isLoading: isLoading,
      isFullWidth: isFullWidth,
    );
  }

  /// Factory constructor for Secondary Mint Button
  factory SoulCareButton.secondary({
    required String label,
    required VoidCallback? onPressed,
    SoulCareButtonSize size = SoulCareButtonSize.large,
    IconData? icon,
    bool isLoading = false,
    bool isFullWidth = true,
  }) {
    return SoulCareButton(
      label: label,
      onPressed: onPressed,
      variant: SoulCareButtonVariant.secondary,
      size: size,
      icon: icon,
      isLoading: isLoading,
      isFullWidth: isFullWidth,
    );
  }

  /// Factory constructor for Outlined Border Button
  factory SoulCareButton.outlined({
    required String label,
    required VoidCallback? onPressed,
    SoulCareButtonSize size = SoulCareButtonSize.large,
    IconData? icon,
    bool isLoading = false,
    bool isFullWidth = true,
  }) {
    return SoulCareButton(
      label: label,
      onPressed: onPressed,
      variant: SoulCareButtonVariant.outlined,
      size: size,
      icon: icon,
      isLoading: isLoading,
      isFullWidth: isFullWidth,
    );
  }

  /// Factory constructor for Text-only Button
  factory SoulCareButton.text({
    required String label,
    required VoidCallback? onPressed,
    SoulCareButtonSize size = SoulCareButtonSize.medium,
    IconData? icon,
    bool isLoading = false,
  }) {
    return SoulCareButton(
      label: label,
      onPressed: onPressed,
      variant: SoulCareButtonVariant.text,
      size: size,
      icon: icon,
      isLoading: isLoading,
      isFullWidth: false,
    );
  }

  double get _height {
    switch (size) {
      case SoulCareButtonSize.small:
        return 36.0;
      case SoulCareButtonSize.medium:
        return 44.0;
      case SoulCareButtonSize.large:
        return 52.0;
    }
  }

  double get _fontSize {
    switch (size) {
      case SoulCareButtonSize.small:
        return 13.0;
      case SoulCareButtonSize.medium:
        return 14.0;
      case SoulCareButtonSize.large:
        return 16.0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bool isDisabled = onPressed == null || isLoading;

    Color backgroundColor;
    Color foregroundColor;
    BorderSide borderSide = BorderSide.none;

    switch (variant) {
      case SoulCareButtonVariant.primary:
        backgroundColor = colorScheme.primary;
        foregroundColor = colorScheme.onPrimary;
        break;
      case SoulCareButtonVariant.secondary:
        backgroundColor = colorScheme.secondaryContainer;
        foregroundColor = colorScheme.onSecondaryContainer;
        break;
      case SoulCareButtonVariant.outlined:
        backgroundColor = Colors.transparent;
        foregroundColor = colorScheme.primary;
        borderSide = BorderSide(color: colorScheme.primary, width: 1.5);
        break;
      case SoulCareButtonVariant.text:
        backgroundColor = Colors.transparent;
        foregroundColor = colorScheme.primary;
        break;
    }

    Widget content;

    if (isLoading) {
      content = SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2.2,
          valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
        ),
      );
    } else {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        main: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: _fontSize + 4, color: foregroundColor),
            AppSpacing.gapH8,
          ],
          Text(
            label,
            style: AppTypography.labelLarge.copyWith(
              fontSize: _fontSize,
              fontWeight: FontWeight.w700,
              color: foregroundColor,
            ),
          ),
        ],
      );
    }

    final buttonWidget = SizedBox(
      height: _height,
      width: isFullWidth ? double.infinity : null,
      child: Material(
        color: isDisabled
            ? (variant == SoulCareButtonVariant.primary
                ? AppColors.textMutedLight.withOpacity(0.3)
                : Colors.transparent)
            : backgroundColor,
        shape: StadiumBorder(side: borderSide),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: isDisabled ? null : onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Center(child: content),
          ),
        ),
      ),
    );

    return buttonWidget;
  }
}
