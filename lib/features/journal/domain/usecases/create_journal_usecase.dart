import '../entities/journal_entry_entity.dart';
import '../entities/journal_failure.dart';
import '../repository/journal_repository.dart';

/// Single responsibility UseCase to create a journal reflection entry
class CreateJournalUseCase {
  final JournalRepository repository;

  const CreateJournalUseCase(this.repository);

  Future<({JournalEntryEntity? entry, JournalFailure? failure})> execute({
    required String content,
    String? moodState,
  }) {
    if (content.trim().isEmpty) {
      return Future.value((
        entry: null,
        failure: const JournalValidationFailure("Journal reflection content cannot be empty.")
      ));
    }
    return repository.createJournal(
      content: content.trim(),
      moodState: moodState,
    );
  }
}
