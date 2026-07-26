import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/models/quick_action_item.dart';

void main() {
  group('QuickActionItem Model Tests', () {
    test('defaultActions returns 4 action items with correct IDs', () {
      final actions = QuickActionItem.defaultActions();
      expect(actions.length, equals(4));
      expect(actions[0].id, equals('new_journal'));
      expect(actions[1].id, equals('view_insights'));
      expect(actions[2].id, equals('community'));
      expect(actions[3].id, equals('mood_checkin'));
    });

    test('callbacks execute when provided', () {
      bool journalCalled = false;
      final actions = QuickActionItem.defaultActions(
        onNewJournal: () => journalCalled = true,
      );
      actions[0].onTap?.call();
      expect(journalCalled, isTrue);
    });
  });
}
