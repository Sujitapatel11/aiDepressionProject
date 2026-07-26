import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Subtle non-blocking banner notifying user that cached data is rendered offline
class OfflineBanner extends StatelessWidget {
  final String message;

  const OfflineBanner({
    Key? key,
    this.message = "Offline Mode - Displaying cached data",
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Semantics(
      label: message,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.softYellowAccent.withOpacity(0.2),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: AppTheme.softYellowAccent.withOpacity(0.4),
          ),
        ),
        child: Row(
          children: [
            const Icon(Icons.wifi_off_rounded, size: 16, color: AppTheme.textMain),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppTheme.textMain,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
