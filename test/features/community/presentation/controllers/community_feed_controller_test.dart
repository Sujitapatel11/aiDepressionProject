import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/community/domain/entities/community_failure.dart';
import 'package:aiDepressionProject/features/community/domain/entities/peer_user_entity.dart';
import 'package:aiDepressionProject/features/community/domain/entities/support_connection_entity.dart';
import 'package:aiDepressionProject/features/community/domain/entities/support_request_entity.dart';
import 'package:aiDepressionProject/features/community/domain/repository/community_repository.dart';
import 'package:aiDepressionProject/features/community/domain/usecases/get_incoming_requests_usecase.dart';
import 'package:aiDepressionProject/features/community/domain/usecases/get_peer_suggestions_usecase.dart';
import 'package:aiDepressionProject/features/community/domain/usecases/get_support_connections_usecase.dart';
import 'package:aiDepressionProject/features/community/domain/usecases/manage_connection_usecase.dart';
import 'package:aiDepressionProject/features/community/domain/usecases/respond_support_request_usecase.dart';
import 'package:aiDepressionProject/features/community/domain/usecases/send_support_request_usecase.dart';
import 'package:aiDepressionProject/features/community/presentation/controllers/community_feed_controller.dart';
import 'package:aiDepressionProject/features/community/presentation/state/community_feed_state.dart';

class MockCommunityRepo implements CommunityRepository {
  List<PeerUserEntity> mockPeers = [
    const PeerUserEntity(id: 1, username: 'Peer_A', matchScore: 85),
    const PeerUserEntity(id: 2, username: 'Peer_B', matchScore: 78),
  ];

  List<SupportRequestEntity> mockReqs = [
    SupportRequestEntity(
      id: 10,
      requestId: 'req_10',
      fromUser: const PeerUserEntity(id: 5, username: 'Incoming_Peer'),
      toUser: const PeerUserEntity(id: 99, username: 'Me'),
      createdAt: DateTime.now(),
    ),
  ];

  List<SupportConnectionEntity> mockConns = [
    SupportConnectionEntity(
      connectionId: 'conn_50',
      peerId: 8,
      peerUsername: 'Connected_Peer',
      alias: 'user_8',
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<({List<PeerUserEntity>? candidates, CommunityFailure? failure})> getPeerSuggestions({String mode = 'smart'}) async {
    return (candidates: mockPeers, failure: null);
  }

  @override
  Future<({List<SupportConnectionEntity>? connections, CommunityFailure? failure})> getActiveConnections() async {
    return (connections: mockConns, failure: null);
  }

  @override
  Future<({List<SupportRequestEntity>? requests, CommunityFailure? failure})> getIncomingRequests() async {
    return (requests: mockReqs, failure: null);
  }

  @override
  Future<({SupportRequestEntity? request, CommunityFailure? failure})> sendSupportRequest(int userId) async {
    final req = SupportRequestEntity(
      id: 99,
      requestId: 'req_99',
      fromUser: const PeerUserEntity(id: 100, username: 'Me'),
      toUser: mockPeers.firstWhere((p) => p.id == userId),
      createdAt: DateTime.now(),
    );
    return (request: req, failure: null);
  }

  @override
  Future<({SupportConnectionEntity? connection, CommunityFailure? failure})> acceptRequest(int requestId) async {
    mockReqs.removeWhere((r) => r.id == requestId);
    final conn = SupportConnectionEntity(
      connectionId: 'conn_new',
      peerId: 5,
      peerUsername: 'Incoming_Peer',
      alias: 'user_5',
      createdAt: DateTime.now(),
    );
    mockConns.add(conn);
    return (connection: conn, failure: null);
  }

  @override
  Future<({bool success, CommunityFailure? failure})> disconnectConnection(String connectionId) async {
    mockConns.removeWhere((c) => c.connectionId == connectionId);
    return (success: true, failure: null);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  late MockCommunityRepo mockRepo;
  late GetPeerSuggestionsUseCase getPeersUseCase;
  late GetSupportConnectionsUseCase getConnsUseCase;
  late GetIncomingRequestsUseCase getReqsUseCase;
  late SendSupportRequestUseCase sendUseCase;
  late RespondSupportRequestUseCase respondUseCase;
  late ManageConnectionUseCase manageUseCase;
  late CommunityFeedController controller;

  setUp(() {
    mockRepo = MockCommunityRepo();
    getPeersUseCase = GetPeerSuggestionsUseCase(mockRepo);
    getConnsUseCase = GetSupportConnectionsUseCase(mockRepo);
    getReqsUseCase = GetIncomingRequestsUseCase(mockRepo);
    sendUseCase = SendSupportRequestUseCase(mockRepo);
    respondUseCase = RespondSupportRequestUseCase(mockRepo);
    manageUseCase = ManageConnectionUseCase(mockRepo);

    controller = CommunityFeedController(
      getPeerSuggestionsUseCase: getPeersUseCase,
      getSupportConnectionsUseCase: getConnsUseCase,
      getIncomingRequestsUseCase: getReqsUseCase,
      sendSupportRequestUseCase: sendUseCase,
      respondSupportRequestUseCase: respondUseCase,
      manageConnectionUseCase: manageUseCase,
    );
  });

  tearDown(() {
    controller.dispose();
  });

  group('CommunityFeedController Refactored Unit Tests', () {
    test('loadFeed populates state with peers, connections, and requests', () async {
      await controller.loadFeed();
      expect(controller.state.status, equals(CommunityFeedStatus.data));
      expect(controller.state.peerSuggestions.length, equals(2));
      expect(controller.state.incomingRequests.length, equals(1));
      expect(controller.state.activeConnections.length, equals(1));
    });

    test('respondToRequest accept moves request to active connections', () async {
      await controller.loadFeed();
      final success = await controller.respondToRequest(10, accept: true);

      expect(success, isTrue);
      expect(controller.state.incomingRequests, isEmpty);
      expect(controller.state.activeConnections.length, equals(2));
    });

    test('disconnect removes active connection', () async {
      await controller.loadFeed();
      final success = await controller.disconnect('conn_50');

      expect(success, isTrue);
      expect(controller.state.activeConnections, isEmpty);
    });
  });
}
