import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/journal/data/dto/journal_entry_dto.dart';

void main() {
  group('JournalEntryDto Tests', () {
    test('fromJson parses journal payload correctly', () {
      final jsonMap = {
        'journal_id': 12,
        'content': 'Evening Walk reflection',
        'mood': 'Calm',
        'created_at': '2026-07-26T18:30:00Z',
      };

      final dto = JournalEntryDto.fromJson(jsonMap);
      expect(dto.journalId, equals(12));
      expect(dto.content, equals('Evening Walk reflection'));
      expect(dto.mood, equals('Calm'));

      final entity = dto.toEntity();
      expect(entity.journalId, equals(12));
      expect(entity.moodState, equals('Calm'));
    });
  });
}
