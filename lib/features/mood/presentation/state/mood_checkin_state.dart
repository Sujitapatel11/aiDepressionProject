import '../../domain/entities/mood_entity.dart';
import '../../domain/entities/mood_failure.dart';

/// Explicit status enum for Mood Check-In screen lifecycle
enum MoodCheckInStatus {
  initial,
  loading,
  editing,
  saving,
  success,
  offline,
  error,
}

/// Immutable state container for Mood Check-In feature
class MoodCheckInState {
  final MoodCheckInStatus status;
  final List<MoodEntity> availableMoods;
  final MoodEntity? selectedMood;
  final String noteText;
  final MoodFailure? failure;
  final int maxCharacterLimit;

  const MoodCheckInState({
    this.status = MoodCheckInStatus.initial,
    this.availableMoods = const [],
    this.selectedMood,
    this.noteText = '',
    this.failure,
    this.maxCharacterLimit = 500,
  });

  bool get isLoading => status == MoodCheckInStatus.loading;
  bool get isEditing => status == MoodCheckInStatus.editing;
  bool get isSaving => status == MoodCheckInStatus.saving;
  bool get isSuccess => status == MoodCheckInStatus.success;
  bool get isOffline => status == MoodCheckInStatus.offline;
  bool get isError => status == MoodCheckInStatus.error;

  int get characterCount => noteText.length;
  int get remainingCharacters => maxCharacterLimit - noteText.length;
  bool get canSave => selectedMood != null && !isSaving && noteText.length <= maxCharacterLimit;

  MoodCheckInState copyWith({
    MoodCheckInStatus? status,
    List<MoodEntity>? availableMoods,
    MoodEntity? selectedMood,
    String? noteText,
    MoodFailure? failure,
    int? maxCharacterLimit,
  }) {
    return MoodCheckInState(
      status: status ?? this.status,
      availableMoods: availableMoods ?? this.availableMoods,
      selectedMood: selectedMood ?? this.selectedMood,
      noteText: noteText ?? this.noteText,
      failure: failure ?? this.failure,
      maxCharacterLimit: maxCharacterLimit ?? this.maxCharacterLimit,
    );
  }
}
