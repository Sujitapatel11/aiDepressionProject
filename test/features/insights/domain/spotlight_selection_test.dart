import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/insights/domain/entities/insight_entity.dart';
import 'package:aiDepressionProject/features/insights/presentation/state/insight_list_state.dart';

void main() {
  group('Spotlight vs History Separation Unit Tests', () {
    test('spotlightInsight gets first item and historyInsights excludes spotlight item', () {
      final item1 = InsightEntity(
        insightId: 101,
        title: 'Spotlight Hero',
        message: 'Latest insight',
        createdAt: DateTime.now(),
      );

      final item2 = InsightEntity(
        insightId: 102,
        title: 'History Item 1',
        message: 'Second insight',
        createdAt: DateTime.now(),
      );

      final state = InsightListState(
        status: InsightListStatus.data,
        insights: [item1, item2],
      );

      expect(state.spotlightInsight?.insightId, equals(101));
      expect(state.historyInsights.length, equals(1));
      expect(state.historyInsights.first.insightId, equals(102));
      expect(state.historyInsights.any((i) => i.insightId == 101), isFalse);
    });
  });
}
