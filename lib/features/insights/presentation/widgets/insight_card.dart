import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/widgets/base_dashboard_card.dart';
import '../../domain/entities/insight_entity.dart';
import 'emotion_tag_chip.dart';
import 'sentiment_badge.dart';

/// Card widget displaying AI Insight spotlight or history item
class InsightCard extends StatelessWidget {
  final InsightEntity insight;
  final bool isSpotlight;
  final VoidCallback? onTap;
  final VoidCallback? onDismiss;

  const InsightCard({
    Key? key,
    required this.insight,
    this.isSpotlight = false,
    this.onTap,
    this.onDismiss,
  }) : super(key: key);

  String _formatTimestamp(DateTime dt) {
    return DateFormat('MMM d, y • h:mm a').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BaseDashboardCard(
      onTap: onTap,
      semanticLabel: "AI Insight: ${insight.title}. ${insight.message}",
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
                      color: AppTheme.lavenderPrimary.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.auto_awesome_rounded,
                      color: AppTheme.lavenderPrimary,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _formatTimestamp(insight.createdAt),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  SentimentBadge(score: insight.sentimentScore),
                  if (onDismiss != null)
                    IconButton(
                      icon: Icon(
                        Icons.close_rounded,
                        size: 18,
                        color: isDark ? const Color(0xFF94A3B8) : AppTheme.textMuted,
                      ),
                      onPressed: onDismiss,
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            insight.title,
            style: TextStyle(
              fontSize: isSpotlight ? 18 : 16,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : AppTheme.textMain,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            insight.message,
            maxLines: isSpotlight ? 4 : 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 14,
              height: 1.4,
              color: isDark ? const Color(0xFFCBD5E1) : AppTheme.textSub,
            ),
          ),
          if (insight.emotionTags.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: insight.emotionTags
                  .take(4)
                  .map((tag) => EmotionTagChip(tag: tag))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }
}
