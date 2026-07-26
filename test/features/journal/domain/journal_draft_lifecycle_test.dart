import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/journal/domain/entities/journal_draft_entity.dart';

void main() {
  group('Journal Draft Lifecycle Unit Tests', () {
    test('JournalDraftEntity correctly identifies empty vs valid draft', () {
      const emptyDraft = JournalDraftEntity(
        draftId: 'test_1',
        content: '   ',
        lastSavedAt: null as dynamic,
      );
      expect(emptyDraft.isEmpty, isTrue);

      final validDraft = JournalDraftEntity(
        draftId: 'test_2',
        content: 'Mindfulness notes',
        lastSavedAt: DateTime.now(),
      );
      expect(validDraft.isEmpty, isFalse);
    });
  });
}
