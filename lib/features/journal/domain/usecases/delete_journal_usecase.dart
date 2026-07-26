import '../entities/journal_failure.dart';
import '../repository/journal_repository.dart';

/// Single responsibility UseCase to soft-delete a journal reflection
class DeleteJournalUseCase {
  final JournalRepository repository;

  const DeleteJournalUseCase(this.repository);

  Future<({bool success, JournalFailure? failure})> execute(int journalId) {
    return repository.deleteJournal(journalId);
  }
}
