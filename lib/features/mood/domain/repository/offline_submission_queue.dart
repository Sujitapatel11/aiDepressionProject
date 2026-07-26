import '../entities/mood_entry_entity.dart';

/// Domain interface extension for queuing offline mood submissions
abstract class OfflineSubmissionQueue {
  /// Enqueues an unsaved mood check-in entry for background synchronization
  Future<void> enqueueSubmission(MoodEntryEntity entry);

  /// Retrieves pending offline submissions
  Future<List<MoodEntryEntity>> getPendingSubmissions();

  /// Clears queued submissions after successful sync
  Future<void> clearQueue();
}
