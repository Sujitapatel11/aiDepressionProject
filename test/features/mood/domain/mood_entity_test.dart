import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/mood/domain/entities/mood_entity.dart';

void main() {
  group('MoodEntity Tests', () {
    test('defaultMoods returns dynamic moods matching 1 to 5 scale', () {
      final moods = MoodEntity.defaultMoods();
      expect(moods.length, equals(6));
      expect(moods[0].id, equals('very_happy'));
      expect(moods[0].score, equals(5));
      expect(moods.last.id, equals('very_sad'));
      expect(moods.last.score, equals(1));
    });

    test('equality compares by mood id', () {
      final m1 = MoodEntity.defaultMoods()[0];
      final m2 = MoodEntity.defaultMoods()[0];
      expect(m1, equals(m2));
    });
  });
}
