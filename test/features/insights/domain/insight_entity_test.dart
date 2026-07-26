import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/insights/domain/entities/insight_entity.dart';

void main() {
  group('InsightEntity Unit Tests', () {
    test('InsightEntity stores AI parameters correctly without local calculation', () {
      final entity = InsightEntity(
        insightId: 1,
        title: 'Emotional Equilibrium',
        message: 'Your reflections demonstrate high resilience during stressful periods.',
        mood: 'Calm',
        sentimentScore: 0.75,
        emotionTags: const ['Mindful', 'Peace'],
        createdAt: DateTime.now(),
      );

      expect(entity.insightId, equals(1));
      expect(entity.sentimentScore, equals(0.75));
      expect(entity.emotionTags, contains('Mindful'));
    });
  });
}
