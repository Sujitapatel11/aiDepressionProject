import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import 'base_dashboard_card.dart';

/// Card displaying overall executive metrics (journals, connections, requests, unread insights)
class DashboardSummaryCard extends StatelessWidget {
  final int journalCount;
  final int activeConnectionsCount;
  final int pendingRequestsCount;
  final int unreadInsightsCount;

  const DashboardSummaryCard({
    Key? key,
    this.journalCount = 0,
    this.activeConnectionsCount = 0,
    this.pendingRequestsCount = 0,
    this.unreadInsightsCount = 0,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAlignment.start,
      children: [
        Text(
          "Dashboard Summary",
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : AppTheme.textMain,
          ),
        ),
        const SizedBox(height: 12),
        BaseDashboardCard(
          padding: const EdgeInsets.all(18),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _MetricItem(
                label: "Reflections",
                value: "$journalCount",
                icon: Icons.book_outlined,
                color: AppTheme.lavenderPrimary,
              ),
              _MetricItem(
                label: "Peers",
                value: "$activeConnectionsCount",
                icon: Icons.people_alt_outlined,
                color: const Color(0xFF0D9488),
              ),
              _MetricItem(
                label: "Requests",
                value: "$pendingRequestsCount",
                icon: Icons.person_add_alt_1_outlined,
                color: const Color(0xFFE11D48),
              ),
              _MetricItem(
                label: "Insights",
                value: "$unreadInsightsCount",
                icon: Icons.lightbulb_outline_rounded,
                color: const Color(0xFFD97706),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MetricItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricItem({
    Key? key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Semantics(
      label: "$label: $value",
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : AppTheme.textMain,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
            ),
          ),
        ],
      ),
    );
  }
}
