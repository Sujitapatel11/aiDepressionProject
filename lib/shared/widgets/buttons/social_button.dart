import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Social OAuth Sign-In Button Component for SoulCare (e.g. Google Sign-In).
class SocialButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final Widget? iconWidget;
  final bool isLoading;

  const SocialButton({
    Key? key,
    required this.label,
    required this.onPressed,
    this.iconWidget,
    this.isLoading = false,
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
              valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
            ),
          )
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (iconWidget != null) ...[
                iconWidget!,
                AppSpacing.gapH12,
              ],
              Text(
                label,
                style: AppTypography.labelLarge.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
            ],
          );

    return Semantics(
      button: true,
      enabled: !isDisabled,
      label: label,
      child: SizedBox(
        height: 52,
        width: double.infinity,
        child: OutlinedButton(
          onPressed: isDisabled ? null : onPressed,
          style: OutlinedButton.styleFrom(
            backgroundColor: colorScheme.surface,
            side: BorderSide(color: colorScheme.outline, width: 1.2),
            shape: const StadiumBorder(),
            padding: const EdgeInsets.symmetric(horizontal: 24),
          ),
          child: child,
        ),
      ),
    );
  }
}
