import '../entities/insight_entity.dart';
import '../entities/insight_failure.dart';
import '../repository/insight_repository.dart';

/// Single responsibility UseCase to fetch list of AI insights
class GetInsightsUseCase {
  final InsightRepository repository;

  const GetInsightsUseCase(this.repository);

  Future<({List<InsightEntity>? insights, InsightFailure? failure})> execute() {
    return repository.getInsights();
  }
}
