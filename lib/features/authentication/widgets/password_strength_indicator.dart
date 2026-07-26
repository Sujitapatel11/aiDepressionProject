import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Live Password Strength Meter with color feedback and requirements checklist
class PasswordStrengthIndicator extends StatelessWidget {
  final double strength; // 0.0 to 1.0
  final String password;

  const PasswordStrengthIndicator({
    Key? key,
    required this.strength,
    required this.password,
  }) : super(key: key);

  Color _getStrengthColor() {
    if (strength <= 0.35) return AppTheme.errorRed;
    if (strength <= 0.70) return AppTheme.softYellowAccent;
    return AppTheme.mintSecondary;
  }

  String _getStrengthText() {
    if (password.isEmpty) return "Enter password";
    if (strength <= 0.35) return "Weak";
    if (strength <= 0.70) return "Fair";
    return "Strong";
  }

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();

    final color = _getStrengthColor();

    return Column(
      crossAxisAlignment: CrossAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: strength,
                  backgroundColor: Colors.grey.withOpacity(0.2),
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                  minHeight: 4,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              _getStrengthText(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
