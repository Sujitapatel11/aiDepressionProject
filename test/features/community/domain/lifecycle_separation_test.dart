import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/community/domain/entities/peer_user_entity.dart';
import 'package:aiDepressionProject/features/community/domain/entities/support_connection_entity.dart';
import 'package:aiDepressionProject/features/community/domain/entities/support_request_entity.dart';
import 'package:aiDepressionProject/features/community/presentation/state/community_feed_state.dart';

void main() {
  group('Community Lifecycle Separation Unit Tests', () {
    test('CommunityFeedState separates incoming requests, active connections, and peer suggestions', () {
      final req = SupportRequestEntity(
        id: 1,
        requestId: 'req_1',
        fromUser: const PeerUserEntity(id: 10, username: 'Peer_A'),
        toUser: const PeerUserEntity(id: 99, username: 'Me'),
        createdAt: DateTime.now(),
      );

      final conn = SupportConnectionEntity(
        connectionId: 'conn_100',
        peerId: 20,
        peerUsername: 'Peer_B',
        alias: 'user_20',
        createdAt: DateTime.now(),
      );

      const peer = PeerUserEntity(id: 30, username: 'Peer_C', matchScore: 85);

      final state = CommunityFeedState(
        status: CommunityFeedStatus.data,
        incomingRequests: [req],
        activeConnections: [conn],
        peerSuggestions: [peer],
      );

      expect(state.incomingRequests.length, equals(1));
      expect(state.activeConnections.length, equals(1));
      expect(state.peerSuggestions.length, equals(1));
      expect(state.incomingRequests.first.fromUser.username, equals('Peer_A'));
      expect(state.activeConnections.first.alias, equals('user_20'));
    });
  });
}
