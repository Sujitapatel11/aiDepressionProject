import '../entities/journal_entry_entity.dart';
import '../entities/journal_failure.dart';
import '../repository/journal_repository.dart';

/// Single responsibility UseCase to fetch list of journal reflections
class GetJournalsUseCase {
  final JournalRepository repository;

  const GetJournalsUseCase(this.repository);

  Future<({List<JournalEntryEntity>? entries, JournalFailure? failure})> execute() {
    return repository.getJournals();
  }
}
