import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Secondary Container Button Component for SoulCare.
/// Uses Mint/Indigo secondary container tokens for lower emphasis actions.
class SecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final double height;
  final bool isFullWidth;

  const SecondaryButton({
    Key? key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.height = 52.0,
    this.isFullWidth = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bool isDisabled = onPressed == null || isLoading;

    final Widget child = isLoading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2.2,
              valueColor: AlwaysStoppedAnimation<Color>(colorScheme.onSecondaryContainer),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            main: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20, color: colorScheme.onSecondaryContainer),
                AppSpacing.gapH8,
              ],
              Text(
                label,
                style: AppTypography.labelLarge.copyWith(
                  color: colorScheme.onSecondaryContainer,
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
            ],
          );

    return Semantics(
      button: true,
      enabled: !isDisabled,
      label: label,
      child: SizedBox(
        height: height,
        width: isFullWidth ? double.infinity : null,
        child: ElevatedButton(
          onPressed: isDisabled ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: colorScheme.secondaryContainer,
            foregroundColor: colorScheme.onSecondaryContainer,
            elevation: 0,
            shape: const StadiumBorder(),
            padding: const EdgeInsets.symmetric(horizontal: 24),
          ),
          child: child,
        ),
      ),
    );
  }
}
