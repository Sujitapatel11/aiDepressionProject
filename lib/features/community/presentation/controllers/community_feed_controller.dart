import 'package:flutter/foundation.dart';
import '../../domain/usecases/get_incoming_requests_usecase.dart';
import '../../domain/usecases/get_peer_suggestions_usecase.dart';
import '../../domain/usecases/get_support_connections_usecase.dart';
import '../../domain/usecases/manage_connection_usecase.dart';
import '../../domain/usecases/respond_support_request_usecase.dart';
import '../../domain/usecases/send_support_request_usecase.dart';
import '../state/community_feed_state.dart';

/// Presentation controller exposing state and standardized actions: loadFeed(), refresh(), loadPeerSuggestions(), loadRequests(), loadConnections(), sendRequest(), respondToRequest(), disconnect(), blockPeer()
class CommunityFeedController extends ChangeNotifier {
  final GetPeerSuggestionsUseCase getPeerSuggestionsUseCase;
  final GetSupportConnectionsUseCase getSupportConnectionsUseCase;
  final GetIncomingRequestsUseCase getIncomingRequestsUseCase;
  final SendSupportRequestUseCase sendSupportRequestUseCase;
  final RespondSupportRequestUseCase respondSupportRequestUseCase;
  final ManageConnectionUseCase manageConnectionUseCase;

  CommunityFeedState _state = const CommunityFeedState();
  CommunityFeedState get state => _state;

  CommunityFeedController({
    required this.getPeerSuggestionsUseCase,
    required this.getSupportConnectionsUseCase,
    required this.getIncomingRequestsUseCase,
    required this.sendSupportRequestUseCase,
    required this.respondSupportRequestUseCase,
    required this.manageConnectionUseCase,
  });

  /// Action: Loads peer suggestions, active connections, and incoming requests
  Future<void> loadFeed() async {
    if (!_state.hasData) {
      _state = _state.copyWith(status: CommunityFeedStatus.loading);
      notifyListeners();
    }

    final peersResult = await getPeerSuggestionsUseCase.execute();
    final connsResult = await getSupportConnectionsUseCase.execute();
    final reqsResult = await getIncomingRequestsUseCase.execute();

    final peers = peersResult.candidates ?? _state.peerSuggestions;
    final conns = connsResult.connections ?? _state.activeConnections;
    final reqs = reqsResult.requests ?? _state.incomingRequests;

    final isOffline = peersResult.failure != null || connsResult.failure != null;

    _state = _state.copyWith(
      status: isOffline
          ? CommunityFeedStatus.cached
          : ((peers.isEmpty && conns.isEmpty && reqs.isEmpty)
              ? CommunityFeedStatus.empty
              : CommunityFeedStatus.data),
      peerSuggestions: peers,
      activeConnections: conns,
      incomingRequests: reqs,
      isOffline: isOffline,
      failure: peersResult.failure ?? connsResult.failure,
      lastCachedAt: DateTime.now(),
    );
    notifyListeners();
  }

  /// Action: Loads peer suggestions specifically
  Future<void> loadPeerSuggestions() async {
    final result = await getPeerSuggestionsUseCase.execute();
    if (result.candidates != null) {
      _state = _state.copyWith(peerSuggestions: result.candidates!);
      notifyListeners();
    }
  }

  /// Action: Loads incoming requests specifically
  Future<void> loadRequests() async {
    final result = await getIncomingRequestsUseCase.execute();
    if (result.requests != null) {
      _state = _state.copyWith(incomingRequests: result.requests!);
      notifyListeners();
    }
  }

  /// Action: Loads active connections specifically
  Future<void> loadConnections() async {
    final result = await getSupportConnectionsUseCase.execute();
    if (result.connections != null) {
      _state = _state.copyWith(activeConnections: result.connections!);
      notifyListeners();
    }
  }

  /// Action: Pull-to-refresh handler
  Future<void> refresh() async {
    _state = _state.copyWith(status: CommunityFeedStatus.refreshing);
    notifyListeners();
    await loadFeed();
  }

  /// Action: Sends a support connection request to a peer candidate
  Future<bool> sendRequest(int userId) async {
    final updatedSent = Set<int>.from(_state.pendingSentUserIds)..add(userId);
    _state = _state.copyWith(pendingSentUserIds: updatedSent);
    notifyListeners();

    final result = await sendSupportRequestUseCase.execute(userId);
    if (result.request != null) {
      return true;
    } else {
      final revertedSent = Set<int>.from(_state.pendingSentUserIds)..remove(userId);
      _state = _state.copyWith(
        pendingSentUserIds: revertedSent,
        failure: result.failure,
      );
      notifyListeners();
      return false;
    }
  }

  /// Action: Accepts or rejects an incoming support request
  Future<bool> respondToRequest(int requestId, {required bool accept}) async {
    if (accept) {
      final result = await respondSupportRequestUseCase.accept(requestId);
      if (result.connection != null) {
        final updatedReqs = List.from(_state.incomingRequests)..removeWhere((r) => r.id == requestId);
        final updatedConns = List.from(_state.activeConnections)..add(result.connection!);
        _state = _state.copyWith(
          incomingRequests: List.castFrom(updatedReqs),
          activeConnections: List.castFrom(updatedConns),
        );
        notifyListeners();
        return true;
      }
    } else {
      final result = await respondSupportRequestUseCase.reject(requestId);
      if (result.success) {
        final updatedReqs = List.from(_state.incomingRequests)..removeWhere((r) => r.id == requestId);
        _state = _state.copyWith(incomingRequests: List.castFrom(updatedReqs));
        notifyListeners();
        return true;
      }
    }
    return false;
  }

  /// Action: Disconnects an active peer connection
  Future<bool> disconnect(String connectionId) async {
    final result = await manageConnectionUseCase.disconnect(connectionId);
    if (result.success) {
      final updatedConns = List.from(_state.activeConnections)..removeWhere((c) => c.connectionId == connectionId);
      _state = _state.copyWith(activeConnections: List.castFrom(updatedConns));
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Action: Blocks an active peer connection
  Future<bool> blockPeer(String connectionId) async {
    final result = await manageConnectionUseCase.block(connectionId);
    if (result.success) {
      final updatedConns = List.from(_state.activeConnections)..removeWhere((c) => c.connectionId == connectionId);
      _state = _state.copyWith(activeConnections: List.castFrom(updatedConns));
      notifyListeners();
      return true;
    }
    return false;
  }
}
