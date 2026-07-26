import 'entities/insight_entity.dart';
import 'entities/insight_failure.dart';

/// Domain contract for AI Insights operations
abstract class InsightRepository {
  /// Fetches list of AI insights from backend
  Future<({List<InsightEntity>? insights, InsightFailure? failure})> getInsights();

  /// Dismisses an AI insight by ID
  Future<({bool success, InsightFailure? failure})> dismissInsight(int insightId);

  /// Triggers AI insight generation for a specific journal entry
  Future<({InsightEntity? insight, InsightFailure? failure})> generateForJournal(int journalId);
}
