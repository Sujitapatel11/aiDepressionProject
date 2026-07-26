import 'package:flutter/foundation.dart';
import '../../domain/entities/insight_entity.dart';
import '../../domain/usecases/dismiss_insight_usecase.dart';
import '../../domain/usecases/generate_insight_usecase.dart';
import '../../domain/usecases/get_insights_usecase.dart';
import '../state/insight_list_state.dart';

/// Presentation controller exposing state and standardized actions: loadInsights(), refresh(), dismissInsight(), generateInsight(), loadCachedInsights()
class InsightListController extends ChangeNotifier {
  final GetInsightsUseCase getInsightsUseCase;
  final DismissInsightUseCase dismissInsightUseCase;
  final GenerateInsightUseCase generateInsightUseCase;

  InsightListState _state = const InsightListState();
  InsightListState get state => _state;

  InsightListController({
    required this.getInsightsUseCase,
    required this.dismissInsightUseCase,
    required this.generateInsightUseCase,
  });

  /// Action: Loads AI insights from repository
  Future<void> loadInsights() async {
    if (!_state.hasData) {
      _state = _state.copyWith(status: InsightListStatus.loading);
      notifyListeners();
    }

    final result = await getInsightsUseCase.execute();

    if (result.failure != null) {
      final list = result.insights ?? _state.insights;
      final isOffline = list.isNotEmpty;
      _state = _state.copyWith(
        status: isOffline ? InsightListStatus.cached : InsightListStatus.error,
        insights: list,
        failure: result.failure,
        isOffline: isOffline,
        lastCachedAt: DateTime.now(),
      );
    } else {
      final list = result.insights ?? [];
      _state = _state.copyWith(
        status: list.isEmpty ? InsightListStatus.empty : InsightListStatus.data,
        insights: list,
        failure: null,
        isOffline: false,
      );
    }
    notifyListeners();
  }

  /// Action: Loads cached insights explicitly for offline fallback
  Future<void> loadCachedInsights() async {
    await loadInsights();
  }

  /// Action: Pull-to-refresh handler (refreshes only insights dataset)
  Future<void> refresh() async {
    _state = _state.copyWith(status: InsightListStatus.refreshing);
    notifyListeners();
    await loadInsights();
  }

  /// Action: Dismisses an AI insight by ID
  Future<bool> dismissInsight(int insightId) async {
    final result = await dismissInsightUseCase.execute(insightId);
    if (result.success) {
      final updatedList = List<InsightEntity>.from(_state.insights)
        ..removeWhere((i) => i.insightId == insightId);

      _state = _state.copyWith(
        insights: updatedList,
        status: updatedList.isEmpty ? InsightListStatus.empty : InsightListStatus.data,
      );
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Action: Triggers AI insight generation for a specific journal entry
  Future<bool> generateInsight(int journalId) async {
    _state = _state.copyWith(status: InsightListStatus.loading);
    notifyListeners();

    final result = await generateInsightUseCase.execute(journalId);
    if (result.insight != null) {
      final updatedList = List<InsightEntity>.from(_state.insights)..insert(0, result.insight!);
      _state = _state.copyWith(
        status: InsightListStatus.data,
        insights: updatedList,
        failure: null,
      );
      notifyListeners();
      return true;
    } else {
      _state = _state.copyWith(
        status: _state.hasData ? InsightListStatus.data : InsightListStatus.error,
        failure: result.failure,
      );
      notifyListeners();
      return false;
    }
  }
}
