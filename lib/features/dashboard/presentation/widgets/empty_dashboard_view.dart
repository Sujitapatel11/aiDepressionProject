import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Reusable empty view widget for dashboard sections
class EmptyDashboardView extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onActionTap;

  const EmptyDashboardView({
    Key? key,
    this.title = "No Data Available",
    this.description = "Your reflections and activity updates will appear here.",
    this.icon = Icons.inbox_outlined,
    this.actionLabel,
    this.onActionTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark
              ? const Color(0xFF334155)
              : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 44,
            color: isDark ? const Color(0xFF64748B) : AppTheme.textMuted,
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : AppTheme.textMain,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            description,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              height: 1.35,
              color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
            ),
          ),
          if (actionLabel != null && onActionTap != null) ...[
            const SizedBox(height: 16),
            SizedBox(
              height: 48,
              child: TextButton.icon(
                onPressed: onActionTap,
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(actionLabel!),
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.lavenderPrimary,
                  minimumSize: const Size(48, 48),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
