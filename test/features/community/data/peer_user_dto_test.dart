import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/community/data/dto/peer_user_dto.dart';

void main() {
  group('PeerUserDto Tests', () {
    test('fromJson parses /api/support/users/ JSON payload correctly', () {
      final jsonMap = {
        'id': 15,
        'username': 'Sam_Mindful',
        'match_score': 88,
        'has_profile': true,
      };

      final dto = PeerUserDto.fromJson(jsonMap);
      expect(dto.id, equals(15));
      expect(dto.username, equals('Sam_Mindful'));
      expect(dto.matchScore, equals(88));

      final entity = dto.toEntity();
      expect(entity.id, equals(15));
      expect(entity.matchScore, equals(88));
    });
  });
}
