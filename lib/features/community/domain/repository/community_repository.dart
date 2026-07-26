import 'entities/community_failure.dart';
import 'entities/peer_user_entity.dart';
import 'entities/support_connection_entity.dart';
import 'entities/support_request_entity.dart';

/// Domain contract for Community & Peer Support operations
abstract class CommunityRepository {
  /// Fetches peer match candidates
  Future<({List<PeerUserEntity>? candidates, CommunityFailure? failure})> getPeerSuggestions({String mode = 'smart'});

  /// Fetches active peer support connections
  Future<({List<SupportConnectionEntity>? connections, CommunityFailure? failure})> getActiveConnections();

  /// Fetches incoming pending support requests
  Future<({List<SupportRequestEntity>? requests, CommunityFailure? failure})> getIncomingRequests();

  /// Sends a support connection request to a peer
  Future<({SupportRequestEntity? request, CommunityFailure? failure})> sendSupportRequest(int userId);

  /// Accepts an incoming support request
  Future<({SupportConnectionEntity? connection, CommunityFailure? failure})> acceptRequest(int requestId);

  /// Rejects an incoming support request
  Future<({bool success, CommunityFailure? failure})> rejectRequest(int requestId);

  /// Blocks an active peer connection
  Future<({bool success, CommunityFailure? failure})> blockConnection(String connectionId);

  /// Disconnects an active peer connection
  Future<({bool success, CommunityFailure? failure})> disconnectConnection(String connectionId);
}
