import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'shake_widget.dart';

/// Reusable labeled text field used across auth screens (login, signup,
/// forgot password). Wraps [ShakeWidget] for the existing shake-on-error
/// behavior and exposes the same configuration surface as a raw
/// [TextField], so it drops in without touching any validation or
/// controller logic.
///
/// Fixes a bug present in the original inline implementation: the prefix
/// icon color depended on `focusNode.hasFocus` but nothing listened to
/// the [FocusNode], so the icon didn't recolor when the field gained
/// focus unless some unrelated rebuild happened to fire. Wrapping the
/// field in an [AnimatedBuilder] listening to [focusNode] fixes that.
class AuthTextField extends StatelessWidget {
  const AuthTextField({
    super.key,
    required this.shakeKey,
    required this.label,
    required this.icon,
    required this.controller,
    required this.focusNode,
    required this.hintText,
    this.errorText,
    this.obscureText = false,
    this.enabled = true,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.suffixIcon,
    this.onSubmitted,
    this.semanticsLabel,
  });

  final GlobalKey<ShakeWidgetState> shakeKey;
  final String label;
  final IconData icon;
  final TextEditingController controller;
  final FocusNode focusNode;
  final String hintText;
  final String? errorText;
  final bool obscureText;
  final bool enabled;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final Widget? suffixIcon;
  final ValueChanged<String>? onSubmitted;

  /// Optional override for screen readers when [label] contains an emoji
  /// or other characters that don't announce cleanly.
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Semantics(
      label: semanticsLabel ?? label,
      textField: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ExcludeSemantics(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.textMain,
              ),
            ),
          ),
          const SizedBox(height: 6),
          ShakeWidget(
            key: shakeKey,
            child: AnimatedBuilder(
              animation: focusNode,
              builder: (context, _) => TextField(
                controller: controller,
                focusNode: focusNode,
                obscureText: obscureText,
                enabled: enabled,
                keyboardType: keyboardType,
                textInputAction: textInputAction,
                autofillHints: autofillHints,
                style: TextStyle(
                  fontSize: 15,
                  color: isDark ? Colors.white : AppTheme.textMain,
                ),
                decoration: InputDecoration(
                  hintText: hintText,
                  errorText: errorText,
                  prefixIcon: Icon(
                    icon,
                    color: focusNode.hasFocus
                        ? AppTheme.lavenderPrimary
                        : AppTheme.textMuted,
                  ),
                  suffixIcon: suffixIcon,
                ),
                onSubmitted: onSubmitted,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
