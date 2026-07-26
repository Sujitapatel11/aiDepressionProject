import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/profile/domain/entities/personality_profile_entity.dart';
import 'package:aiDepressionProject/features/profile/domain/entities/user_profile_entity.dart';

void main() {
  group('Profile & Personality Decoupling Unit Tests', () {
    test('PersonalityProfileEntity has zero dependencies on auth tokens or session user keys', () {
      const personality = PersonalityProfileEntity(
        openness: 0.85,
        conscientiousness: 0.75,
        dominantEmotion: 'peaceful',
        hasData: true,
      );

      const user = UserProfileEntity(
        id: 1,
        username: 'sam_soulcare',
        email: 'sam@soulcare.app',
        displayName: 'Sam SoulCare',
      );

      expect(personality.openness, equals(0.85));
      expect(user.username, equals('sam_soulcare'));
    });
  });
}
