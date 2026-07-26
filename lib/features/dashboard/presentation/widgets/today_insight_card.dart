import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import 'base_dashboard_card.dart';

/// Card widget displaying the latest AI-generated sentiment insight or clean placeholder state
class TodayInsightCard extends StatelessWidget {
  final String? title;
  final String? message;
  final String? moodTag;
  final double? sentimentScore;
  final bool isLoading;
  final bool isCached;
  final VoidCallback? onTap;

  const TodayInsightCard({
    Key? key,
    this.title,
    this.message,
    this.moodTag,
    this.sentimentScore,
    this.isLoading = false,
    this.isCached = false,
    this.onTap,
  }) : super(key: key);

  bool get _hasInsight =>
      (title != null && title!.isNotEmpty) || (message != null && message!.isNotEmpty);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final String semanticsText = _hasInsight
        ? "Today's AI Insight: ${title ?? ''}. ${message ?? ''}"
        : "Today's AI Insight. No AI Insights Available yet.";

    return BaseDashboardCard(
      borderColor: isDark
          ? const Color(0xFF334155)
          : AppTheme.mintSecondary.withOpacity(0.3),
      semanticLabel: semanticsText,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.mintSecondary.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.auto_awesome_rounded,
                      color: Color(0xFF0D9488),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    "Today's AI Insight",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : AppTheme.textMain,
                    ),
                  ),
                ],
              ),
              if (_hasInsight && moodTag != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.mintSecondary.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    moodTag!,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F766E),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          if (isLoading)
            _buildLoadingState(isDark)
          else if (_hasInsight) ...[
            if (title != null && title!.isNotEmpty)
              Text(
                title!,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppTheme.textMain,
                ),
              ),
            if (title != null && title!.isNotEmpty) const SizedBox(height: 6),
            Text(
              message ?? '',
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 14,
                height: 1.4,
                color: isDark ? const Color(0xFFCBD5E1) : AppTheme.textSub,
              ),
            ),
          ] else ...[
            Text(
              "No AI Insights Available Yet",
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              "Log your daily reflections to unlock personalized sentiment analysis and mental wellness guidance.",
              style: TextStyle(
                fontSize: 13,
                height: 1.35,
                color: isDark ? const Color(0xFF64748B) : AppTheme.textMuted,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    final baseColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    return Column(
      crossAxisAlignment: CrossAlignment.start,
      children: [
        Container(
          width: 140,
          height: 16,
          decoration: BoxDecoration(
            color: baseColor,
            borderRadius: BorderRadius.circular(6),
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
    );
  }
}
