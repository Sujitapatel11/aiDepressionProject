import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/journal/domain/entities/journal_entry_entity.dart';

void main() {
  group('JournalEntryEntity Unit Tests', () {
    test('titleSnippet extracts first line of content', () {
      final entry = JournalEntryEntity(
        journalId: 1,
        content: 'Morning Reflection\nToday I feel peaceful.',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      expect(entry.titleSnippet, equals('Morning Reflection'));
    });

    test('titleSnippet truncates long single-line text', () {
      final longText = 'A' * 60;
      final entry = JournalEntryEntity(
        journalId: 2,
        content: longText,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      expect(entry.titleSnippet.length, equals(43)); // 40 + '...'
      expect(entry.titleSnippet, endsWith('...'));
    });
  });
}
