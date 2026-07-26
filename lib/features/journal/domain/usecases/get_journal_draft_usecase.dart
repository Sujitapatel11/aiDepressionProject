import '../entities/journal_draft_entity.dart';
import '../repository/journal_repository.dart';

/// Single responsibility UseCase to retrieve stored local reflection draft
class GetJournalDraftUseCase {
  final JournalRepository repository;

  const GetJournalDraftUseCase(this.repository);

  Future<JournalDraftEntity?> execute() {
    return repository.getDraft();
  }
}
