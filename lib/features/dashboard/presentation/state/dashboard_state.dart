import '../../domain/entities/dashboard_failure.dart';
import '../../domain/entities/dashboard_summary_entity.dart';

/// 7 Dashboard UI Status States
enum DashboardStatus {
  initial,
  loading,
  data,
  empty,
  error,
  offline,
  refreshing,
}

class DashboardState {
  final DashboardStatus status;
  final DashboardSummaryEntity? summary;
  final DashboardFailure? failure;

  const DashboardState({
    this.status = DashboardStatus.initial,
    this.summary,
    this.failure,
  });

  bool get isLoading => status == DashboardStatus.loading;
  bool get isRefreshing => status == DashboardStatus.refreshing;
  bool get isOffline => status == DashboardStatus.offline;
  bool get isEmpty => status == DashboardStatus.empty;
  bool get isError => status == DashboardStatus.error;

  DashboardState copyWith({
    DashboardStatus? status,
    DashboardSummaryEntity? summary,
    DashboardFailure? failure,
  }) {
    return DashboardState(
      status: status ?? this.status,
      summary: summary ?? this.summary,
      failure: failure ?? this.failure,
    );
  }
}
