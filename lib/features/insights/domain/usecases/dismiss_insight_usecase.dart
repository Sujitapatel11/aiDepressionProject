import '../entities/insight_failure.dart';
import '../repository/insight_repository.dart';

/// Single responsibility UseCase to dismiss an AI insight
class DismissInsightUseCase {
  final InsightRepository repository;

  const DismissInsightUseCase(this.repository);

  Future<({bool success, InsightFailure? failure})> execute(int insightId) {
    return repository.dismissInsight(insightId);
  }
}
