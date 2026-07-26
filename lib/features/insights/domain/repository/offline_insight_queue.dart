/// Domain interface for queuing offline AI insight operations
abstract class OfflineInsightQueue {
  /// Enqueues an insight dismissal for background synchronization
  Future<void> enqueueDismissal(int insightId);

  /// Retrieves pending offline insight dismissals
  Future<List<int>> getPendingDismissals();

  /// Clears queued dismissals after successful synchronization
  Future<void> clearQueue();
}
