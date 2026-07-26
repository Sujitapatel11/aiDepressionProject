import '../entities/mood_entry_entity.dart';
import '../entities/mood_failure.dart';
import '../repository/mood_repository.dart';

/// Single responsibility UseCase to submit or edit a mood check-in
class SubmitMoodCheckInUseCase {
  final MoodRepository repository;

  const SubmitMoodCheckInUseCase(this.repository);

  Future<({MoodEntryEntity? entry, MoodFailure? failure})> execute({
    required String moodState,
    String? note,
  }) {
    if (moodState.trim().isEmpty) {
      return Future.value((
        entry: null,
        failure: const MoodValidationFailure("Please select a mood before saving.")
      ));
    }
    if (note != null && note.length > 500) {
      return Future.value((
        entry: null,
        failure: const MoodValidationFailure("Reflection note cannot exceed 500 characters.")
      ));
    }

    return repository.submitMoodCheckIn(
      moodState: moodState.trim(),
      note: note?.trim(),
    );
  }
}
