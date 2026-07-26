import 'package:flutter/foundation.dart';
import '../../domain/entities/mood_entity.dart';
import '../../domain/entities/mood_failure.dart';
import '../../domain/usecases/get_todays_mood_usecase.dart';
import '../../domain/usecases/submit_mood_checkin_usecase.dart';
import '../state/mood_checkin_state.dart';

/// Presentation controller exposing state and standardized actions: loadToday(), selectMood(), updateNote(), submit()
class MoodCheckInController extends ChangeNotifier {
  final GetTodaysMoodUseCase getTodaysMoodUseCase;
  final SubmitMoodCheckInUseCase submitMoodCheckInUseCase;

  MoodCheckInState _state = const MoodCheckInState();
  MoodCheckInState get state => _state;

  MoodCheckInController({
    required this.getTodaysMoodUseCase,
    required this.submitMoodCheckInUseCase,
  }) {
    _initMoods();
  }

  void _initMoods() {
    final moods = MoodEntity.defaultMoods();
    _state = _state.copyWith(
      status: MoodCheckInStatus.initial,
      availableMoods: moods,
      selectedMood: moods[2], // Default to 'Calm'
    );
  }

  /// Action: Loads today's existing check-in data to pre-populate state
  Future<void> loadToday() async {
    _state = _state.copyWith(status: MoodCheckInStatus.loading);
    notifyListeners();

    final result = await getTodaysMoodUseCase.execute();
    if (result.entry != null) {
      final entry = result.entry!;
      final matchingMood = _state.availableMoods.firstWhere(
        (m) => m.label.toLowerCase() == entry.moodState.toLowerCase() ||
               m.id.toLowerCase() == entry.moodState.toLowerCase(),
        orElse: () => _state.availableMoods[2],
      );

      _state = _state.copyWith(
        status: MoodCheckInStatus.editing,
        selectedMood: matchingMood,
        noteText: entry.note ?? '',
      );
    } else {
      _state = _state.copyWith(status: MoodCheckInStatus.initial);
    }
    notifyListeners();
  }

  /// Action: Selects a mood
  void selectMood(MoodEntity mood) {
    if (_state.selectedMood == mood || _state.isSaving) return;
    _state = _state.copyWith(selectedMood: mood, failure: null);
    notifyListeners();
  }

  /// Action: Updates reflection note text
  void updateNote(String text) {
    if (_state.isSaving) return;
    _state = _state.copyWith(noteText: text, failure: null);
    notifyListeners();
  }

  /// Action: Submits mood check-in
  Future<bool> submit() async {
    if (!_state.canSave) return false;

    _state = _state.copyWith(status: MoodCheckInStatus.saving, failure: null);
    notifyListeners();

    final result = await submitMoodCheckInUseCase.execute(
      moodState: _state.selectedMood!.label,
      note: _state.noteText.isNotEmpty ? _state.noteText : null,
    );

    if (result.failure != null) {
      final isOfflineErr = result.failure is MoodNetworkFailure;
      _state = _state.copyWith(
        status: isOfflineErr ? MoodCheckInStatus.offline : MoodCheckInStatus.error,
        failure: result.failure,
      );
      notifyListeners();
      return false;
    } else {
      _state = _state.copyWith(
        status: MoodCheckInStatus.success,
        failure: null,
      );
      notifyListeners();
      return true;
    }
  }

  /// Action: Clears error state
  void clearError() {
    if (_state.isError || _state.isOffline) {
      _state = _state.copyWith(
        status: _state.noteText.isNotEmpty ? MoodCheckInStatus.editing : MoodCheckInStatus.initial,
        failure: null,
      );
      notifyListeners();
    }
  }
}
