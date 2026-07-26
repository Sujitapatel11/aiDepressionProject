import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Immutable data model representing a quick action item card
class QuickActionItem {
  final String id;
  final String title;
  final IconData icon;
  final Color color;
  final String semanticLabel;
  final VoidCallback? onTap;

  const QuickActionItem({
    required this.id,
    required this.title,
    required this.icon,
    required this.color,
    required this.semanticLabel,
    this.onTap,
  });

  /// Factory providing default 4 dashboard quick action definitions
  static List<QuickActionItem> defaultActions({
    VoidCallback? onNewJournal,
    VoidCallback? onViewInsights,
    VoidCallback? onCommunity,
    VoidCallback? onMoodCheckIn,
  }) {
    return [
      QuickActionItem(
        id: 'new_journal',
        title: 'New Journal',
        icon: Icons.edit_note_rounded,
        color: AppTheme.lavenderPrimary,
        semanticLabel: 'Create new journal reflection entry',
        onTap: onNewJournal,
      ),
      QuickActionItem(
        id: 'view_insights',
        title: 'View Insights',
        icon: Icons.analytics_outlined,
        color: const Color(0xFF0D9488),
        semanticLabel: 'View AI sentiment insights and emotion trends',
        onTap: onViewInsights,
      ),
      QuickActionItem(
        id: 'community',
        title: 'Community',
        icon: Icons.people_outline_rounded,
        color: const Color(0xFFE11D48),
        semanticLabel: 'Explore matched peer support community',
        onTap: onCommunity,
      ),
      QuickActionItem(
        id: 'mood_checkin',
        title: 'Mood Check-In',
        icon: Icons.sentiment_satisfied_rounded,
        color: const Color(0xFFD97706),
        semanticLabel: 'Perform daily mood check-in',
        onTap: onMoodCheckIn,
      ),
    ];
  }
}
