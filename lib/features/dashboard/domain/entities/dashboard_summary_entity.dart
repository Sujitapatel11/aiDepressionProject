/// Domain entity representing high-level user Dashboard summary
class DashboardSummaryEntity {
  final int userId;
  final String username;
  final int activeStreakDays;
  final String moodState;
  final double sentimentScore;
  final int unreadNotificationsCount;
  final int pendingRequestsCount;
  final int activeConnectionsCount;
  final int journalCount;
  final String? latestJournalPreview;
  final DateTime? latestJournalCreatedAt;

  const DashboardSummaryEntity({
    required this.userId,
    required this.username,
    required this.activeStreakDays,
    required this.moodState,
    required this.sentimentScore,
    required this.unreadNotificationsCount,
    this.pendingRequestsCount = 0,
    this.activeConnectionsCount = 0,
    this.journalCount = 0,
    this.latestJournalPreview,
    this.latestJournalCreatedAt,
  });
}
