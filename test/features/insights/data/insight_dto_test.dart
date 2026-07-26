import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/insights/data/dto/insight_dto.dart';

void main() {
  group('InsightDto Tests', () {
    test('fromJson parses /api/insights/ JSON payload correctly', () {
      final jsonMap = {
        'insight_id': 10,
        'title': 'Mindfulness Growth',
        'message': 'Noticeable improvement in emotional regulation.',
        'mood': 'Happy',
        'sentiment_score': 0.85,
        'emotion_tags': ['Gratitude', 'Joy'],
        'keywords': ['meditation', 'walk'],
        'created_at': '2026-07-26T20:00:00Z',
        'journal_id': 5,
        'is_read': true,
        'is_dismissed': false,
      };

      final dto = InsightDto.fromJson(jsonMap);
      expect(dto.insightId, equals(10));
      expect(dto.title, equals('Mindfulness Growth'));
      expect(dto.sentimentScore, equals(0.85));
      expect(dto.emotionTags, contains('Gratitude'));

      final entity = dto.toEntity();
      expect(entity.insightId, equals(10));
      expect(entity.journalId, equals(5));
    });
  });
}
