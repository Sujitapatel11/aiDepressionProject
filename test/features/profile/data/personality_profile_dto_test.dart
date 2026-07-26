import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/profile/data/dto/personality_profile_dto.dart';

void main() {
  group('PersonalityProfileDto Tests', () {
    test('fromJson parses /api/support/personality/ JSON payload correctly', () {
      final jsonMap = {
        'openness': 0.8,
        'conscientiousness': 0.7,
        'extraversion': 0.6,
        'agreeableness': 0.9,
        'neuroticism': 0.3,
        'dominant_emotion': 'peaceful',
        'has_data': true,
      };

      final dto = PersonalityProfileDto.fromJson(jsonMap);
      expect(dto.openness, equals(0.8));
      expect(dto.agreeableness, equals(0.9));
      expect(dto.dominantEmotion, equals('peaceful'));
      expect(dto.hasData, isTrue);

      final entity = dto.toEntity();
      expect(entity.openness, equals(0.8));
      expect(entity.neuroticism, equals(0.3));
    });
  });
}
