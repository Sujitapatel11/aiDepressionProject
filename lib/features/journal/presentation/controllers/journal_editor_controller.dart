import 'dart:async';
import 'package:flutter/foundation.dart';

import '../../../mood/domain/entities/mood_entity.dart';
import '../../domain/entities/journal_draft_entity.dart';
import '../../domain/entities/journal_entry_entity.dart';
import '../../domain/usecases/create_journal_usecase.dart';
import '../../domain/usecases/get_journal_draft_usecase.dart';
import '../../domain/usecases/save_journal_draft_usecase.dart';
import '../../domain/usecases/update_journal_usecase.dart';
import '../state/journal_editor_state.dart';

/// Presentation controller exposing state and actions: loadEntry(), updateDraft(), selectMood(), submit(), recoverDraft()
class JournalEditorController extends ChangeNotifier {
  final CreateJournalUseCase createJournalUseCase;
  final UpdateJournalUseCase updateJournalUseCase;
  final SaveJournalDraftUseCase saveJournalDraftUseCase;
  final GetJournalDraftUseCase getJournalDraftUseCase;

  Timer? _singleDebounceTimer;
  JournalEditorState _state = const JournalEditorState();
  JournalEditorState get state => _state;

  JournalEditorController({
    required this.createJournalUseCase,
    required this.updateJournalUseCase,
    required this.saveJournalDraftUseCase,
    required this.getJournalDraftUseCase,
  }) {
    _initMoods();
  }

  @override
  void dispose() {
    _singleDebounceTimer?.cancel();
    super.dispose();
  }

  void _initMoods() {
    final moods = MoodEntity.defaultMoods();
    _state = _state.copyWith(
      status: JournalEditorStatus.initial,
      availableMoods: moods,
      selectedMood: moods[2], // Default 'Calm'
    );
  }

  /// Action: Loads an existing journal reflection for editing
  void loadEntry(JournalEntryEntity entry) {
    final matchingMood = _state.availableMoods.firstWhere(
      (m) => m.label.toLowerCase() == (entry.moodState ?? '').toLowerCase() ||
             m.id.toLowerCase() == (entry.moodState ?? '').toLowerCase(),
      orElse: () => _state.availableMoods[2],
    );

    _state = _state.copyWith(
      status: JournalEditorStatus.editing,
      journalId: entry.journalId,
      bodyText: entry.content,
      selectedMood: matchingMood,
      isEditingExisting: true,
      isDraft: false,
    );
    notifyListeners();
  }

  /// Action: Recovers local unsaved draft automatically if writing a new reflection
  Future<void> recoverDraft() async {
    if (_state.isEditingExisting) return;

    final draft = await getJournalDraftUseCase.execute();
    if (draft != null && !draft.isEmpty) {
      final matchingMood = _state.availableMoods.firstWhere(
        (m) => m.label.toLowerCase() == (draft.moodState ?? '').toLowerCase(),
        orElse: () => _state.availableMoods[2],
      );

      _state = _state.copyWith(
        status: JournalEditorStatus.editing,
        bodyText: draft.content,
        selectedMood: matchingMood,
        isDraft: true,
        lastAutoSavedAt: draft.lastSavedAt,
      );
      notifyListeners();
    }
  }

  /// Action: Updates reflection draft body text and schedules single debounced auto-save (1.5s)
  void updateDraft(String text) {
    if (_state.isSaving) return;

    _state = _state.copyWith(bodyText: text, failure: null);
    notifyListeners();

    _scheduleDebouncedAutoSave();
  }

  /// Action: Selects associated mood tag
  void selectMood(MoodEntity mood) {
    if (_state.selectedMood == mood || _state.isSaving) return;

    _state = _state.copyWith(selectedMood: mood, failure: null);
    notifyListeners();

    _scheduleDebouncedAutoSave();
  }

  void _scheduleDebouncedAutoSave() {
    _singleDebounceTimer?.cancel();
    _singleDebounceTimer = Timer(const Duration(milliseconds: 1500), _executeAutoSave);
  }

  /// Internal: Executes debounced auto-save of local draft
  Future<void> _executeAutoSave() async {
    if (_state.isEditingExisting || _state.isSaving) return;

    if (_state.bodyText.trim().isNotEmpty) {
      _state = _state.copyWith(status: JournalEditorStatus.autoSaving);
      notifyListeners();

      final now = DateTime.now();
      final draft = JournalDraftEntity(
        draftId: 'active_draft',
        content: _state.bodyText,
        moodState: _state.selectedMood?.label,
        lastSavedAt: now,
      );
      await saveJournalDraftUseCase.execute(draft);

      _state = _state.copyWith(
        status: JournalEditorStatus.editing,
        isDraft: true,
        lastAutoSavedAt: now,
      );
      notifyListeners();
    }
  }

  /// Action: Submits reflection to backend and clears local draft upon success
  Future<bool> submit() async {
    if (!_state.canSave) return false;

    _singleDebounceTimer?.cancel();
    _state = _state.copyWith(status: JournalEditorStatus.saving, failure: null);
    notifyListeners();

    if (_state.isEditingExisting && _state.journalId != null) {
      final result = await updateJournalUseCase.execute(
        journalId: _state.journalId!,
        content: _state.bodyText,
        moodState: _state.selectedMood?.label,
      );
      if (result.failure != null) {
        _state = _state.copyWith(
          status: JournalEditorStatus.error,
          failure: result.failure,
        );
        notifyListeners();
        return false;
      }
    } else {
      final result = await createJournalUseCase.execute(
        content: _state.bodyText,
        moodState: _state.selectedMood?.label,
      );
      if (result.failure != null) {
        _state = _state.copyWith(
          status: JournalEditorStatus.error,
          failure: result.failure,
        );
        notifyListeners();
        return false;
      }
    }

    // Clear local draft lifecycle after successful submission
    await saveJournalDraftUseCase.execute(
      const JournalDraftEntity(
        draftId: 'active_draft',
        content: '',
        lastSavedAt: null as dynamic,
      ),
    );

    _state = _state.copyWith(
      status: JournalEditorStatus.success,
      isDraft: false,
      failure: null,
    );
    notifyListeners();
    return true;
  }
}
