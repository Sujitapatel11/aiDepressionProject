import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/mood/domain/entities/mood_entry_entity.dart';
import 'package:aiDepressionProject/features/mood/domain/entities/mood_failure.dart';
import 'package:aiDepressionProject/features/mood/domain/repository/mood_repository.dart';
import 'package:aiDepressionProject/features/mood/domain/usecases/get_todays_mood_usecase.dart';
import 'package:aiDepressionProject/features/mood/domain/usecases/submit_mood_checkin_usecase.dart';
import 'package:aiDepressionProject/features/mood/presentation/controllers/mood_checkin_controller.dart';
import 'package:aiDepressionProject/features/mood/presentation/screens/mood_checkin_screen.dart';

class MockIntegrationMoodRepo implements MoodRepository {
  MoodEntryEntity? savedEntry;
  bool simulateOffline = false;

  @override
  Future<({MoodEntryEntity? entry, MoodFailure? failure})> getTodaysMood() async {
    return (entry: savedEntry, failure: null);
  }

  @override
  Future<({MoodEntryEntity? entry, MoodFailure? failure})> submitMoodCheckIn({
    required String moodState,
    String? note,
  }) async {
    if (simulateOffline) {
      return (entry: null, failure: const MoodNetworkFailure());
    }
    savedEntry = MoodEntryEntity(
      id: 99,
      moodState: moodState,
      note: note,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    return (entry: savedEntry, failure: null);
  }
}

void main() {
  testWidgets('Full Mood Check-In Flow Integration Test', (tester) async {
    final mockRepo = MockIntegrationMoodRepo();
    bool dashboardRefreshed = false;

    final controller = MoodCheckInController(
      getTodaysMoodUseCase: GetTodaysMoodUseCase(mockRepo),
      submitMoodCheckInUseCase: SubmitMoodCheckInUseCase(mockRepo),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: MoodCheckInScreen(
          controller: controller,
          onSuccess: () => dashboardRefreshed = true,
        ),
      ),
    );

    // 1. Select 'Very Happy' mood card
    final happyCard = find.text('Very Happy');
    expect(happyCard, findsOneWidget);
    await tester.tap(happyCard);
    await tester.pumpAndSettle();

    // 2. Type reflection note
    final noteField = find.byType(TextField);
    await tester.enterText(noteField, 'Beautiful day for mindfulness!');
    await tester.pumpAndSettle();

    // 3. Tap Save Button
    final saveButton = find.text('Save Mood Check-In');
    await tester.tap(saveButton);
    await tester.pumpAndSettle();

    // 4. Verify save success and dashboard refresh callback
    expect(dashboardRefreshed, isTrue);
    expect(mockRepo.savedEntry?.moodState, equals('Very Happy'));
    expect(mockRepo.savedEntry?.note, equals('Beautiful day for mindfulness!'));
  });
}
