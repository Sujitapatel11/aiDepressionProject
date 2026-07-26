import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/mood/domain/entities/mood_failure.dart';

void main() {
  group('Mood Domain Failure & Validation Tests', () {
    test('MoodValidationFailure stores validation message', () {
      const failure = MoodValidationFailure("Reflection note cannot exceed 500 characters.");
      expect(failure.message, contains("500 characters"));
    });

    test('MoodNetworkFailure provides default network error message', () {
      const failure = MoodNetworkFailure();
      expect(failure.message, contains("internet connection"));
    });

    test('MoodTimeoutFailure handles request timeout', () {
      const failure = MoodTimeoutFailure();
      expect(failure.message, contains("timed out"));
    });
  });
}
