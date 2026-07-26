import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/mood/domain/entities/mood_entry_entity.dart';
import 'package:aiDepressionProject/features/mood/domain/entities/mood_failure.dart';
import 'package:aiDepressionProject/features/mood/domain/repository/mood_repository.dart';
import 'package:aiDepressionProject/features/mood/domain/usecases/get_todays_mood_usecase.dart';
import 'package:aiDepressionProject/features/mood/domain/usecases/submit_mood_checkin_usecase.dart';
import 'package:aiDepressionProject/features/mood/presentation/controllers/mood_checkin_controller.dart';
import 'package:aiDepressionProject/features/mood/presentation/screens/mood_checkin_screen.dart';

class MockMoodRepo implements MoodRepository {
  @override
  Future<({MoodEntryEntity? entry, MoodFailure? failure})> getTodaysMood() async {
    return (entry: null, failure: null);
  }

  @override
  Future<({MoodEntryEntity? entry, MoodFailure? failure})> submitMoodCheckIn({
    required String moodState,
    String? note,
  }) async {
    return (
      entry: MoodEntryEntity(
        id: 1,
        moodState: moodState,
        note: note,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      failure: null
    );
  }
}

void main() {
  testWidgets('MoodCheckInScreen renders header, mood selector grid, note field, and save button', (tester) async {
    final mockRepo = MockMoodRepo();
    final controller = MoodCheckInController(
      getTodaysMoodUseCase: GetTodaysMoodUseCase(mockRepo),
      submitMoodCheckInUseCase: SubmitMoodCheckInUseCase(mockRepo),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: MoodCheckInScreen(controller: controller),
      ),
    );

    expect(find.text('Daily Mood Check-In'), findsOneWidget);
    expect(find.text('How are you feeling right now?'), findsOneWidget);
    expect(find.text('Select Mood'), findsOneWidget);
    expect(find.text('Optional Reflection'), findsOneWidget);
    expect(find.text('Save Mood Check-In'), findsOneWidget);
  });
}
