import '../entities/journal_entry_entity.dart';

/// Domain interface for queuing offline journal reflection submissions
abstract class OfflineJournalQueue {
  /// Enqueues an unsaved reflection submission for background synchronization
  Future<void> enqueueSubmission(JournalEntryEntity entry);

  /// Retrieves pending offline journal submissions
  Future<List<JournalEntryEntity>> getPendingSubmissions();

  /// Clears queued submissions after successful synchronization
  Future<void> clearQueue();
}
