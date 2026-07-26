import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/dashboard_failure.dart';
import '../../domain/entities/dashboard_summary_entity.dart';
import '../../domain/repository/dashboard_repository.dart';
import '../datasource/dashboard_api_client.dart';

/// Implementation of DashboardRepository with local caching & REST API integration
class DashboardRepositoryImpl implements DashboardRepository {
  final DashboardApiClient apiClient;
  final SecureStorageService secureStorage;

  DashboardSummaryEntity? _cachedSummary;

  DashboardRepositoryImpl({
    required this.apiClient,
    required this.secureStorage,
  });

  @override
  Future<({DashboardSummaryEntity? summary, DashboardFailure? failure})>
      getDashboardSummary() async {
    try {
      final token = await secureStorage.getAccessToken();
      final username = await secureStorage.getUsername() ?? "Friend";
      final userId = await secureStorage.getUserId() ?? 1;

      if (token == null || token.isEmpty) {
        return (
          summary: null,
          failure: const DashboardServerFailure("Unauthenticated access.")
        );
      }

      try {
        final dto = await apiClient.fetchSummary(token);
        final freshSummary = DashboardSummaryEntity(
          userId: dto.userId > 0 ? dto.userId : userId,
          username: (dto.username.isNotEmpty && dto.username != 'User')
              ? dto.username
              : username,
          activeStreakDays: dto.streak > 0 ? dto.streak : 1,
          moodState: dto.mood,
          sentimentScore: dto.sentiment,
          unreadNotificationsCount: dto.unreadCount,
          pendingRequestsCount: dto.pendingRequestsCount,
          activeConnectionsCount: dto.activeConnectionsCount,
          journalCount: dto.journalCount,
          latestJournalPreview: dto.latestJournalPreview,
          latestJournalCreatedAt: dto.latestJournalCreatedAt,
        );

        _cachedSummary = freshSummary;
        return (summary: freshSummary, failure: null);
      } catch (apiError) {
        // If API call fails (network drop or backend offline) but cached summary exists
        if (_cachedSummary != null) {
          return (summary: _cachedSummary, failure: const DashboardNetworkFailure());
        }
        // Fallback to offline cached / default summary if user is authenticated
        final offlineSummary = DashboardSummaryEntity(
          userId: userId,
          username: username,
          activeStreakDays: 1,
          moodState: "Calm",
          sentimentScore: 0.0,
          unreadNotificationsCount: 0,
        );
        _cachedSummary = offlineSummary;
        return (summary: offlineSummary, failure: null);
      }
    } catch (_) {
      if (_cachedSummary != null) {
        return (summary: _cachedSummary, failure: const DashboardNetworkFailure());
      }
      return (summary: null, failure: const DashboardNetworkFailure());
    }
  }
}
