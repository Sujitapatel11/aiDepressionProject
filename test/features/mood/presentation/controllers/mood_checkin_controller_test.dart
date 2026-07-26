import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/mood/domain/entities/mood_entry_entity.dart';
import 'package:aiDepressionProject/features/mood/domain/entities/mood_failure.dart';
import 'package:aiDepressionProject/features/mood/domain/repository/mood_repository.dart';
import 'package:aiDepressionProject/features/mood/domain/usecases/get_todays_mood_usecase.dart';
import 'package:aiDepressionProject/features/mood/domain/usecases/submit_mood_checkin_usecase.dart';
import 'package:aiDepressionProject/features/mood/presentation/controllers/mood_checkin_controller.dart';
import 'package:aiDepressionProject/features/mood/presentation/state/mood_checkin_state.dart';

class MockMoodRepository implements MoodRepository {
  bool shouldFail = false;
  MoodEntryEntity? existingEntry;

  @override
  Future<({MoodEntryEntity? entry, MoodFailure? failure})> getTodaysMood() async {
    return (entry: existingEntry, failure: null);
  }

  @override
  Future<({MoodEntryEntity? entry, MoodFailure? failure})> submitMoodCheckIn({
    required String moodState,
    String? note,
  }) async {
    if (shouldFail) {
      return (entry: null, failure: const MoodNetworkFailure());
    }
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
  late MockMoodRepository mockRepo;
  late GetTodaysMoodUseCase getUseCase;
  late SubmitMoodCheckInUseCase submitUseCase;
  late MoodCheckInController controller;

  setUp(() {
    mockRepo = MockMoodRepository();
    getUseCase = GetTodaysMoodUseCase(mockRepo);
    submitUseCase = SubmitMoodCheckInUseCase(mockRepo);
    controller = MoodCheckInController(
      getTodaysMoodUseCase: getUseCase,
      submitMoodCheckInUseCase: submitUseCase,
    );
  });

  tearDown(() {
    controller.dispose();
  });

  group('MoodCheckInController Unit Tests', () {
    test('initial state has status initial', () {
      expect(controller.state.status, equals(MoodCheckInStatus.initial));
      expect(controller.state.selectedMood?.label, equals('Calm'));
    });

    test('selectMood updates selected mood', () {
      final happyMood = controller.state.availableMoods.firstWhere((m) => m.id == 'happy');
      controller.selectMood(happyMood);
      expect(controller.state.selectedMood, equals(happyMood));
    });

    test('updateNote updates reflection text and character count', () {
      controller.updateNote('Feeling hopeful after a walk');
      expect(controller.state.noteText, equals('Feeling hopeful after a walk'));
      expect(controller.state.characterCount, equals(28));
    });

    test('loadToday pre-populates state when existing entry exists', () async {
      mockRepo.existingEntry = MoodEntryEntity(
        id: 10,
        moodState: 'Happy',
        note: 'Existing morning reflection',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      await controller.loadToday();

      expect(controller.state.status, equals(MoodCheckInStatus.editing));
      expect(controller.state.selectedMood?.label, equals('Happy'));
      expect(controller.state.noteText, equals('Existing morning reflection'));
    });

    test('submit updates state to success on repository success', () async {
      final success = await controller.submit();
      expect(success, isTrue);
      expect(controller.state.status, equals(MoodCheckInStatus.success));
    });
  });
}
