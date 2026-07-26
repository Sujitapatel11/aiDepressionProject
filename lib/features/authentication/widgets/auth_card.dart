import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Reusable floating glassmorphic container card for authentication forms
class AuthCard extends StatelessWidget {
  final Widget child;

  const AuthCard({
    Key? key,
    required this.child,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: isDark
              ? const Color(0xFF334155)
              : AppTheme.lavenderPrimary.withOpacity(0.08),
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.lavenderPrimary.withOpacity(0.06),
            blurRadius: 36,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: child,
    );
  }
}
