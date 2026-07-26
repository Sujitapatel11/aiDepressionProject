import '../entities/mood_entry_entity.dart';
import '../entities/mood_failure.dart';
import '../repository/mood_repository.dart';

/// Single responsibility UseCase to fetch today's mood check-in entry
class GetTodaysMoodUseCase {
  final MoodRepository repository;

  const GetTodaysMoodUseCase(this.repository);

  Future<({MoodEntryEntity? entry, MoodFailure? failure})> execute() {
    return repository.getTodaysMood();
  }
}
