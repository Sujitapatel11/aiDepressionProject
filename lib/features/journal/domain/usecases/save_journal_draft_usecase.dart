import '../entities/journal_draft_entity.dart';
import '../repository/journal_repository.dart';

/// Single responsibility UseCase to persist an unsaved local reflection draft
class SaveJournalDraftUseCase {
  final JournalRepository repository;

  const SaveJournalDraftUseCase(this.repository);

  Future<void> execute(JournalDraftEntity draft) {
    if (draft.isEmpty) {
      return repository.clearDraft();
    }
    return repository.saveDraft(draft);
  }
}
