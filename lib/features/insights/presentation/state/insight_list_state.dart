import '../../domain/entities/insight_entity.dart';
import '../../domain/entities/insight_failure.dart';

enum InsightListStatus {
  initial,
  loading,
  refreshing,
  data,
  empty,
  offline,
  cached,
  error,
}

/// Immutable state container for AI Insights home screen
class InsightListState {
  final InsightListStatus status;
  final List<InsightEntity> insights;
  final InsightFailure? failure;
  final bool isOffline;
  final DateTime? lastCachedAt;

  const InsightListState({
    this.status = InsightListStatus.initial,
    this.insights = const [],
    this.failure,
    this.isOffline = false,
    this.lastCachedAt,
  });

  bool get isLoading => status == InsightListStatus.loading;
  bool get isRefreshing => status == InsightListStatus.refreshing;
  bool get isEmpty => (status == InsightListStatus.empty) || (status == InsightListStatus.data && insights.isEmpty);
  bool get isError => status == InsightListStatus.error;
  bool get isCached => status == InsightListStatus.cached;
  bool get hasData => insights.isNotEmpty;

  /// Spotlight insight (Hero item)
  InsightEntity? get spotlightInsight => insights.isNotEmpty ? insights.first : null;

  /// History insights timeline (strictly excludes spotlight insight to prevent item duplication)
  List<InsightEntity> get historyInsights => insights.length > 1 ? insights.sublist(1) : const [];

  InsightListState copyWith({
    InsightListStatus? status,
    List<InsightEntity>? insights,
    InsightFailure? failure,
    bool? isOffline,
    DateTime? lastCachedAt,
  }) {
    return InsightListState(
      status: status ?? this.status,
      insights: insights ?? this.insights,
      failure: failure ?? this.failure,
      isOffline: isOffline ?? this.isOffline,
      lastCachedAt: lastCachedAt ?? this.lastCachedAt,
    );
  }
}
