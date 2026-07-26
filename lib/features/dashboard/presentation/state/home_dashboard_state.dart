import '../../domain/entities/dashboard_failure.dart';
import '../../domain/entities/dashboard_summary_entity.dart';

/// Strongly-typed 7 UI status states for Home Dashboard
enum HomeDashboardStatus {
  initial,
  loading,
  data,
  empty,
  error,
  offline,
  refreshing,
}

/// Immutable state container for Home Dashboard
class HomeDashboardState {
  final HomeDashboardStatus status;
  final DashboardSummaryEntity? summary;
  final DashboardFailure? failure;
  final String userName;
  final String? userAvatarUrl;
  final String greeting;
  final String formattedDate;
  final bool isOffline;
  final bool hasCachedData;

  const HomeDashboardState({
    this.status = HomeDashboardStatus.initial,
    this.summary,
    this.failure,
    this.userName = 'Friend',
    this.userAvatarUrl,
    this.greeting = 'Good Morning',
    this.formattedDate = '',
    this.isOffline = false,
    this.hasCachedData = false,
  });

  bool get isLoading => status == HomeDashboardStatus.loading;
  bool get isRefreshing => status == HomeDashboardStatus.refreshing;
  bool get isOfflineMode => status == HomeDashboardStatus.offline || isOffline;
  bool get isError => status == HomeDashboardStatus.error;
  bool get isEmpty => status == HomeDashboardStatus.empty;
  bool get hasData => summary != null;

  HomeDashboardState copyWith({
    HomeDashboardStatus? status,
    DashboardSummaryEntity? summary,
    DashboardFailure? failure,
    String? userName,
    String? userAvatarUrl,
    String? greeting,
    String? formattedDate,
    bool? isOffline,
    bool? hasCachedData,
  }) {
    return HomeDashboardState(
      status: status ?? this.status,
      summary: summary ?? this.summary,
      failure: failure ?? this.failure,
      userName: userName ?? this.userName,
      userAvatarUrl: userAvatarUrl ?? this.userAvatarUrl,
      greeting: greeting ?? this.greeting,
      formattedDate: formattedDate ?? this.formattedDate,
      isOffline: isOffline ?? this.isOffline,
      hasCachedData: hasCachedData ?? this.hasCachedData,
    );
  }
}
