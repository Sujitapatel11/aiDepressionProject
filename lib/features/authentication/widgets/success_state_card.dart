import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Reusable neutral confirmation card displayed after password reset email submission
class SuccessStateCard extends StatelessWidget {
  final String email;
  final VoidCallback onReturnToLogin;

  const SuccessStateCard({
    Key? key,
    required this.email,
    required this.onReturnToLogin,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppTheme.mintSecondary.withOpacity(0.18),
          ),
          child: const Icon(
            Icons.mark_email_read_rounded,
            color: AppTheme.lavenderPrimary,
            size: 38,
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          "Check Your Inbox 📩",
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppTheme.textMain,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          "If an account exists for $email, we have sent instructions to reset your password.",
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14.5,
            height: 1.5,
            color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
          ),
        ),
        const SizedBox(height: 28),
        SizedBox(
          height: 52,
          width: double.infinity,
          child: OutlinedButton(
            onPressed: onReturnToLogin,
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppTheme.lavenderPrimary, width: 1.5),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            child: const Text(
              "Return to Log In",
              style: TextStyle(
                fontSize: 15.5,
                fontWeight: FontWeight.bold,
                color: AppTheme.lavenderPrimary,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
