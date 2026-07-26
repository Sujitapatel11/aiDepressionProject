import '../../domain/entities/dashboard_summary_entity.dart';

/// DTO for Dashboard Summary response
class DashboardSummaryDto {
  final int userId;
  final String username;
  final int streak;
  final String mood;
  final double sentiment;
  final int unreadCount;

  const DashboardSummaryDto({
    required this.userId,
    required this.username,
    required this.streak,
    required this.mood,
    required this.sentiment,
    required this.unreadCount,
  });

  factory DashboardSummaryDto.fromJson(Map<String, dynamic> json) {
    return DashboardSummaryDto(
      userId: json['user_id'] as int? ?? 0,
      username: json['username'] as String? ?? 'User',
      streak: json['streak'] as int? ?? 0,
      mood: json['mood'] as String? ?? 'Calm',
      sentiment: (json['sentiment'] as num?)?.toDouble() ?? 0.0,
      unreadCount: json['unread_count'] as int? ?? 0,
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
    );
  }
}
