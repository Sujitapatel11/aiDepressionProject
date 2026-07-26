import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Reusable Email Input Text Field with prefix icon and error messaging
class EmailTextField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final String? errorText;
  final bool enabled;
  final ValueChanged<String>? onSubmitted;

  const EmailTextField({
    Key? key,
    required this.controller,
    required this.focusNode,
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
          "📧 Email",
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
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.email],
          enabled: enabled,
          style: TextStyle(
            fontSize: 15,
            color: isDark ? Colors.white : AppTheme.textMain,
          ),
          decoration: InputDecoration(
            hintText: "Enter your email",
            errorText: errorText,
            prefixIcon: Icon(
              Icons.mail_outline_rounded,
              color: focusNode.hasFocus
                  ? AppTheme.lavenderPrimary
                  : AppTheme.textMuted,
            ),
          ),
          onSubmitted: onSubmitted,
        ),
      ],
    );
  }
}
