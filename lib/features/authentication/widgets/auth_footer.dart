import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Reusable footer with link to Signup flow
class AuthFooter extends StatelessWidget {
  final VoidCallback? onCreateAccountTap;

  const AuthFooter({
    Key? key,
    this.onCreateAccountTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Don't have an account? ",
          style: TextStyle(
            fontSize: 14,
            color: isDark ? Colors.white70 : AppTheme.textSub,
            fontWeight: FontWeight.w500,
          ),
        ),
        GestureDetector(
          onTap: onCreateAccountTap,
          child: Row(
            children: const [
              Text(
                "Create Account",
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.lavenderPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(width: 2),
              Icon(
                Icons.arrow_forward_rounded,
                size: 14,
                color: AppTheme.lavenderPrimary,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
