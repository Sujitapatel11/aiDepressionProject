import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import 'base_dashboard_card.dart';
import 'empty_dashboard_view.dart';

/// Card widget displaying recent user reflections/activities supporting loading, empty, populated, and offline states
class RecentActivityCard extends StatelessWidget {
  final String? latestJournalPreview;
  final DateTime? latestJournalCreatedAt;
  final int totalJournalsCount;
  final bool isLoading;
  final bool isOffline;
  final VoidCallback? onViewAllTap;

  const RecentActivityCard({
    Key? key,
    this.latestJournalPreview,
    this.latestJournalCreatedAt,
    this.totalJournalsCount = 0,
    this.isLoading = false,
    this.isOffline = false,
    this.onViewAllTap,
  }) : super(key: key);

  bool get _hasActivity =>
      latestJournalPreview != null && latestJournalPreview!.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "Recent Activity",
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : AppTheme.textMain,
              ),
            ),
            if (_hasActivity && onViewAllTap != null)
              TextButton(
                onPressed: onViewAllTap,
                style: TextButton.styleFrom(
                  minimumSize: const Size(48, 48),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: const Text(
                  "View All",
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.lavenderPrimary,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (isLoading)
          _buildLoadingCard(isDark)
        else if (_hasActivity)
          BaseDashboardCard(
            semanticLabel: "Recent Activity: $latestJournalPreview",
            child: Row(
              crossAxisAlignment: CrossAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.lavenderPrimary.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.book_outlined,
                    color: AppTheme.lavenderPrimary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "Journal Reflection",
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : AppTheme.textMain,
                            ),
                          ),
                          Text(
                            "Latest",
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: isDark
                                  ? const Color(0xFF94A3B8)
                                  : AppTheme.textMuted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        latestJournalPreview!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.35,
                          color: isDark
                              ? const Color(0xFFCBD5E1)
                              : AppTheme.textSub,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          )
        else
          const EmptyDashboardView(
            title: "No Recent Activity",
            description:
                "Your recent journal reflections and wellness activities will appear here.",
          ),
      ],
    );
  }

  Widget _buildLoadingCard(bool isDark) {
    final baseColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    return BaseDashboardCard(
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(color: baseColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              children: [
                Container(
                  width: 120,
                  height: 14,
                  decoration: BoxDecoration(
                    color: baseColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  height: 12,
                  decoration: BoxDecoration(
                    color: baseColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
