import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Reusable New Password Input Text Field with eye toggle
class NewPasswordTextField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool isObscured;
  final VoidCallback onToggleVisibility;
  final String? errorText;
  final bool enabled;
  final ValueChanged<String>? onSubmitted;

  const NewPasswordTextField({
    Key? key,
    required this.controller,
    required this.focusNode,
    required this.isObscured,
    required this.onToggleVisibility,
    this.errorText,
    this.enabled = true,
    this.onSubmitted,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAlignment.start,
      children: [
        const Text(
          "🔒 New Password",
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppTheme.textMain,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          focusNode: focusNode,
          obscureText: isObscured,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.newPassword],
          enabled: enabled,
          style: TextStyle(
            fontSize: 15,
            color: isDark ? Colors.white : AppTheme.textMain,
          ),
          decoration: InputDecoration(
            hintText: "Enter your new password",
            errorText: errorText,
            prefixIcon: Icon(
              Icons.lock_reset_rounded,
              color: focusNode.hasFocus
                  ? AppTheme.lavenderPrimary
                  : AppTheme.textMuted,
            ),
            suffixIcon: IconButton(
              icon: Icon(
                isObscured
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
                color: AppTheme.textMuted,
              ),
              onPressed: onToggleVisibility,
            ),
          ),
          onSubmitted: onSubmitted,
        ),
      ],
    );
  }
}
