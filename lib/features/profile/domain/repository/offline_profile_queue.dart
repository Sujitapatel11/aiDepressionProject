/// Domain interface for queuing offline Profile & Settings operations
abstract class OfflineProfileQueue {
  /// Enqueues a profile update for background synchronization
  Future<void> enqueueUpdate(String displayName);

  /// Retrieves pending offline profile updates
  Future<List<String>> getPendingUpdates();

  /// Clears queued updates after successful synchronization
  Future<void> clearQueue();
}
