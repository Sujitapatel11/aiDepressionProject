import '../../domain/entities/dashboard_summary_entity.dart';

/// DTO for Dashboard Summary response
class DashboardSummaryDto {
  final int userId;
  final String username;
  final int streak;
  final String mood;
  final double sentiment;
  final int unreadCount;
  final int pendingRequestsCount;
  final int activeConnectionsCount;
  final int journalCount;
  final String? latestJournalPreview;
  final DateTime? latestJournalCreatedAt;

  const DashboardSummaryDto({
    required this.userId,
    required this.username,
    required this.streak,
    required this.mood,
    required this.sentiment,
    required this.unreadCount,
    this.pendingRequestsCount = 0,
    this.activeConnectionsCount = 0,
    this.journalCount = 0,
    this.latestJournalPreview,
    this.latestJournalCreatedAt,
  });

  factory DashboardSummaryDto.fromJson(Map<String, dynamic> json) {
    String? previewText;
    DateTime? createdAt;

    if (json['latest_journal_preview'] != null && json['latest_journal_preview'] is Map) {
      final previewMap = json['latest_journal_preview'] as Map<String, dynamic>;
      previewText = previewMap['content'] as String?;
      if (previewMap['created_at'] != null) {
        createdAt = DateTime.tryParse(previewMap['created_at'].toString());
      }
    }

    return DashboardSummaryDto(
      userId: json['user_id'] as int? ?? 0,
      username: json['username'] as String? ?? 'User',
      streak: json['streak'] as int? ?? json['active_streak_days'] as int? ?? 0,
      mood: json['mood'] as String? ?? json['mood_state'] as String? ?? 'Calm',
      sentiment: (json['sentiment'] as num?)?.toDouble() ?? 0.0,
      unreadCount: json['unread_insights_count'] as int? ?? json['unread_count'] as int? ?? 0,
      pendingRequestsCount: json['pending_requests_count'] as int? ?? 0,
      activeConnectionsCount: json['active_connections_count'] as int? ?? 0,
      journalCount: json['journal_count'] as int? ?? 0,
      latestJournalPreview: previewText,
      latestJournalCreatedAt: createdAt,
    );
  }

  DashboardSummaryEntity toEntity() {
    return DashboardSummaryEntity(
      userId: userId,
      username: username,
      activeStreakDays: streak,
      moodState: mood,
      sentimentScore: sentiment,
      unreadNotificationsCount: unreadCount,
      pendingRequestsCount: pendingRequestsCount,
      activeConnectionsCount: activeConnectionsCount,
      journalCount: journalCount,
      latestJournalPreview: latestJournalPreview,
      latestJournalCreatedAt: latestJournalCreatedAt,
    );
  }
}
