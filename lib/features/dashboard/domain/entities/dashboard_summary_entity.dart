/// Domain entity representing high-level user Dashboard summary
class DashboardSummaryEntity {
  final int userId;
  final String username;
  final int activeStreakDays;
  final String moodState;
  final double sentimentScore;
  final int unreadNotificationsCount;

  const DashboardSummaryEntity({
    required this.userId,
    required this.username,
    required this.activeStreakDays,
    required this.moodState,
    required this.sentimentScore,
    required this.unreadNotificationsCount,
  });
}
