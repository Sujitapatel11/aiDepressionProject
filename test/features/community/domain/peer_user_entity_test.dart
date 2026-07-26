import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/community/domain/entities/peer_user_entity.dart';

void main() {
  group('PeerUserEntity Unit Tests', () {
    test('PeerUserEntity stores matchScore and profile status correctly', () {
      const entity = PeerUserEntity(
        id: 10,
        username: 'Alex_Support',
        matchScore: 92,
        hasProfile: true,
      );

      expect(entity.id, equals(10));
      expect(entity.matchScore, equals(92));
      expect(entity.hasProfile, isTrue);
    });
  });
}
