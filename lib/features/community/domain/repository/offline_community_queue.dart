/// Domain interface for queuing offline Community & Peer Support operations
abstract class OfflineCommunityQueue {
  /// Enqueues a peer request for background synchronization
  Future<void> enqueueRequest(int userId);

  /// Retrieves pending offline peer requests
  Future<List<int>> getPendingRequests();

  /// Clears queued requests after successful synchronization
  Future<void> clearQueue();
}
