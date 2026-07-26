import '../entities/insight_entity.dart';
import '../entities/insight_failure.dart';
import '../repository/insight_repository.dart';

/// Single responsibility UseCase to trigger AI insight generation for a journal entry
class GenerateInsightUseCase {
  final InsightRepository repository;

  const GenerateInsightUseCase(this.repository);

  Future<({InsightEntity? insight, InsightFailure? failure})> execute(int journalId) {
    return repository.generateForJournal(journalId);
  }
}
