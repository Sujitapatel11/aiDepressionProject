import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/utils/greeting_helper.dart';

void main() {
  group('GreetingHelper Tests', () {
    test('returns Good Morning for morning hours (5 to 11)', () {
      final morningTime = DateTime(2026, 7, 26, 8, 30);
      expect(GreetingHelper.getGreeting(morningTime), equals('Good Morning'));
    });

    test('returns Good Afternoon for afternoon hours (12 to 16)', () {
      final afternoonTime = DateTime(2026, 7, 26, 14, 0);
      expect(GreetingHelper.getGreeting(afternoonTime), equals('Good Afternoon'));
    });

    test('returns Good Evening for evening hours (17 to 4)', () {
      final eveningTime = DateTime(2026, 7, 26, 20, 15);
      final nightTime = DateTime(2026, 7, 26, 2, 0);
      expect(GreetingHelper.getGreeting(eveningTime), equals('Good Evening'));
      expect(GreetingHelper.getGreeting(nightTime), equals('Good Evening'));
    });

    test('formats date correctly', () {
      final sampleDate = DateTime(2026, 7, 26, 10, 0); // Sunday, Jul 26
      final formatted = GreetingHelper.getFormattedDate(sampleDate);
      expect(formatted, contains('Sunday'));
      expect(formatted, contains('Jul'));
    });
  });
}
