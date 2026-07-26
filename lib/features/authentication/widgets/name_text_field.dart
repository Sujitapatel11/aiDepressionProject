import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Reusable Full Name Input Text Field
class NameTextField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final String? errorText;
  final bool enabled;
  final ValueChanged<String>? onSubmitted;

  const NameTextField({
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
          "👤 Full Name",
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
          keyboardType: TextInputType.name,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.name],
          enabled: enabled,
          style: TextStyle(
            fontSize: 15,
            color: isDark ? Colors.white : AppTheme.textMain,
          ),
          decoration: InputDecoration(
            hintText: "Enter your full name",
            errorText: errorText,
            prefixIcon: Icon(
              Icons.person_outline_rounded,
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
