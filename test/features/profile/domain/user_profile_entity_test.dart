import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/profile/domain/entities/user_profile_entity.dart';

void main() {
  group('UserProfileEntity Unit Tests', () {
    test('UserProfileEntity stores user identity parameters correctly', () {
      const entity = UserProfileEntity(
        id: 1,
        username: 'sam_soulcare',
        email: 'sam@example.com',
        displayName: 'Sam SoulCare',
      );

      expect(entity.id, equals(1));
      expect(entity.username, equals('sam_soulcare'));
      expect(entity.email, equals('sam@example.com'));
      expect(entity.displayName, equals('Sam SoulCare'));
    });
  });
}
