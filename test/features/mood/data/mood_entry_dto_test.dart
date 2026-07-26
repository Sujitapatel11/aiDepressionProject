import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/mood/data/dto/mood_entry_dto.dart';

void main() {
  group('MoodEntryDto Tests', () {
    test('fromJson parses journal/mood payload correctly', () {
      final jsonMap = {
        'journal_id': 101,
        'mood': 'Calm',
        'content': 'Mood Check-In: Calm - Feeling serene today.',
        'created_at': '2026-07-26T12:00:00Z',
      };

      final dto = MoodEntryDto.fromJson(jsonMap);
      expect(dto.id, equals(101));
      expect(dto.mood, equals('Calm'));
      expect(dto.content, contains('serene'));

      final entity = dto.toEntity();
      expect(entity.id, equals(101));
      expect(entity.moodState, equals('Calm'));
    });
  });
}
