import '../entities/journal_entry_entity.dart';
import '../entities/journal_failure.dart';
import '../repository/journal_repository.dart';

/// Single responsibility UseCase to update an existing journal reflection
class UpdateJournalUseCase {
  final JournalRepository repository;

  const UpdateJournalUseCase(this.repository);

  Future<({JournalEntryEntity? entry, JournalFailure? failure})> execute({
    required int journalId,
    required String content,
    String? moodState,
  }) {
    if (content.trim().isEmpty) {
      return Future.value((
        entry: null,
        failure: const JournalValidationFailure("Journal reflection content cannot be empty.")
      ));
    }
    return repository.updateJournal(
      journalId: journalId,
      content: content.trim(),
      moodState: moodState,
    );
  }
}
