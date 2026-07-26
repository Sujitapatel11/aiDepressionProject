import '../../domain/entities/community_failure.dart';
import '../../domain/entities/peer_user_entity.dart';
import '../../domain/entities/support_connection_entity.dart';
import '../../domain/entities/support_request_entity.dart';

enum CommunityFeedStatus {
  initial,
  loading,
  refreshing,
  data,
  empty,
  offline,
  cached,
  error,
}

/// Immutable state container for Community & Peer Support feed screen
class CommunityFeedState {
  final CommunityFeedStatus status;
  final List<PeerUserEntity> peerSuggestions;
  final List<SupportConnectionEntity> activeConnections;
  final List<SupportRequestEntity> incomingRequests;
  final List<SupportRequestEntity> outgoingRequests;
  final Set<int> pendingSentUserIds;
  final CommunityFailure? failure;
  final bool isOffline;
  final DateTime? lastCachedAt;

  const CommunityFeedState({
    this.status = CommunityFeedStatus.initial,
    this.peerSuggestions = const [],
    this.activeConnections = const [],
    this.incomingRequests = const [],
    this.outgoingRequests = const [],
    this.pendingSentUserIds = const {},
    this.failure,
    this.isOffline = false,
    this.lastCachedAt,
  });

  bool get isLoading => status == CommunityFeedStatus.loading;
  bool get isRefreshing => status == CommunityFeedStatus.refreshing;
  bool get isEmpty => (status == CommunityFeedStatus.empty) || (status == CommunityFeedStatus.data && peerSuggestions.isEmpty && activeConnections.isEmpty && incomingRequests.isEmpty);
  bool get isError => status == CommunityFeedStatus.error;
  bool get isCached => status == CommunityFeedStatus.cached;
  bool get hasData => peerSuggestions.isNotEmpty || activeConnections.isNotEmpty || incomingRequests.isNotEmpty;

  CommunityFeedState copyWith({
    CommunityFeedStatus? status,
    List<PeerUserEntity>? peerSuggestions,
    List<SupportConnectionEntity>? activeConnections,
    List<SupportRequestEntity>? incomingRequests,
    List<SupportRequestEntity>? outgoingRequests,
    Set<int>? pendingSentUserIds,
    CommunityFailure? failure,
    bool? isOffline,
    DateTime? lastCachedAt,
  }) {
    return CommunityFeedState(
      status: status ?? this.status,
      peerSuggestions: peerSuggestions ?? this.peerSuggestions,
      activeConnections: activeConnections ?? this.activeConnections,
      incomingRequests: incomingRequests ?? this.incomingRequests,
      outgoingRequests: outgoingRequests ?? this.outgoingRequests,
      pendingSentUserIds: pendingSentUserIds ?? this.pendingSentUserIds,
      failure: failure ?? this.failure,
      isOffline: isOffline ?? this.isOffline,
      lastCachedAt: lastCachedAt ?? this.lastCachedAt,
    );
  }
}
