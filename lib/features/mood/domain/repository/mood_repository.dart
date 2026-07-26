import '../entities/mood_entry_entity.dart';
import '../entities/mood_failure.dart';

/// Domain contract for Mood Check-In operations
abstract class MoodRepository {
  /// Fetches today's existing mood check-in entry if present
  Future<({MoodEntryEntity? entry, MoodFailure? failure})> getTodaysMood();

  /// Submits or updates today's mood check-in
  Future<({MoodEntryEntity? entry, MoodFailure? failure})> submitMoodCheckIn({
    required String moodState,
    String? note,
  });
}
