import 'package:flutter/material.dart';
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
import 'package:aiDepressionProject/features/community/presentation/screens/community_feed_screen.dart';

class MockWorkflowCommunityRepo implements CommunityRepository {
  @override
  Future<({List<PeerUserEntity>? candidates, CommunityFailure? failure})> getPeerSuggestions({String mode = 'smart'}) async {
    return (
      candidates: [
        const PeerUserEntity(id: 1, username: 'Jordan_Peer', matchScore: 91),
      ],
      failure: null
    );
  }

  @override
  Future<({List<SupportConnectionEntity>? connections, CommunityFailure? failure})> getActiveConnections() async {
    return (
      connections: [
        SupportConnectionEntity(
          connectionId: 'c1',
          peerId: 5,
          peerUsername: 'Active_Peer',
          alias: 'user_5',
          createdAt: DateTime.now(),
        ),
      ],
      failure: null
    );
  }

  @override
  Future<({List<SupportRequestEntity>? requests, CommunityFailure? failure})> getIncomingRequests() async {
    return (
      requests: [
        SupportRequestEntity(
          id: 10,
          requestId: 'r10',
          fromUser: const PeerUserEntity(id: 8, username: 'Incoming_User'),
          toUser: const PeerUserEntity(id: 99, username: 'Me'),
          createdAt: DateTime.now(),
        ),
      ],
      failure: null
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('Full Community Feed Workflow Integration Test', (tester) async {
    final mockRepo = MockWorkflowCommunityRepo();
    final controller = CommunityFeedController(
      getPeerSuggestionsUseCase: GetPeerSuggestionsUseCase(mockRepo),
      getSupportConnectionsUseCase: GetSupportConnectionsUseCase(mockRepo),
      getIncomingRequestsUseCase: GetIncomingRequestsUseCase(mockRepo),
      sendSupportRequestUseCase: SendSupportRequestUseCase(mockRepo),
      respondSupportRequestUseCase: RespondSupportRequestUseCase(mockRepo),
      manageConnectionUseCase: ManageConnectionUseCase(mockRepo),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: CommunityFeedScreen(controller: controller),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Peer Community & Support'), findsOneWidget);
    expect(find.text('Pending Support Requests (1)'), findsOneWidget);
    expect(find.text('Incoming_User'), findsOneWidget);
    expect(find.text('Connected Support Peers (1)'), findsOneWidget);
    expect(find.text('user_5'), findsOneWidget);
    expect(find.text('RECOMMENDED PEER MATCHES'), findsOneWidget);
    expect(find.text('Jordan_Peer'), findsOneWidget);
  });
}
