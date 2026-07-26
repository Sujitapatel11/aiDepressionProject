import 'entities/journal_draft_entity.dart';
import 'entities/journal_entry_entity.dart';
import 'entities/journal_failure.dart';

/// Domain contract for Journal operations
abstract class JournalRepository {
  /// Fetches chronological list of journal reflections
  Future<({List<JournalEntryEntity>? entries, JournalFailure? failure})> getJournals();

  /// Fetches single journal reflection detail
  Future<({JournalEntryEntity? entry, JournalFailure? failure})> getJournalDetail(int journalId);

  /// Creates a new journal reflection
  Future<({JournalEntryEntity? entry, JournalFailure? failure})> createJournal({
    required String content,
    String? moodState,
  });

  /// Updates an existing journal reflection
  Future<({JournalEntryEntity? entry, JournalFailure? failure})> updateJournal({
    required int journalId,
    required String content,
    String? moodState,
  });

  /// Soft-deletes a journal reflection
  Future<({bool success, JournalFailure? failure})> deleteJournal(int journalId);

  /// Saves local unsaved reflection draft
  Future<void> saveDraft(JournalDraftEntity draft);

  /// Retrieves stored local reflection draft
  Future<JournalDraftEntity?> getDraft();

  /// Clears stored local draft
  Future<void> clearDraft();
}
