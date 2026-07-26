import '../../../mood/domain/entities/mood_entity.dart';
import '../../domain/entities/journal_failure.dart';

enum JournalEditorStatus {
  initial,
  loading,
  editing,
  saving,
  autoSaving,
  success,
  offline,
  error,
}

/// Immutable state container for Journal Reflection Editor screen
class JournalEditorState {
  final JournalEditorStatus status;
  final int? journalId;
  final String bodyText;
  final MoodEntity? selectedMood;
  final List<MoodEntity> availableMoods;
  final JournalFailure? failure;
  final bool isDraft;
  final bool isEditingExisting;
  final DateTime? lastAutoSavedAt;

  const JournalEditorState({
    this.status = JournalEditorStatus.initial,
    this.journalId,
    this.bodyText = '',
    this.selectedMood,
    this.availableMoods = const [],
    this.failure,
    this.isDraft = false,
    this.isEditingExisting = false,
    this.lastAutoSavedAt,
  });

  bool get isLoading => status == JournalEditorStatus.loading;
  bool get isSaving => status == JournalEditorStatus.saving;
  bool get isAutoSaving => status == JournalEditorStatus.autoSaving;
  bool get isSuccess => status == JournalEditorStatus.success;
  bool get canSave => bodyText.trim().isNotEmpty && !isSaving;

  JournalEditorState copyWith({
    JournalEditorStatus? status,
    int? journalId,
    String? bodyText,
    MoodEntity? selectedMood,
    List<MoodEntity>? availableMoods,
    JournalFailure? failure,
    bool? isDraft,
    bool? isEditingExisting,
    DateTime? lastAutoSavedAt,
  }) {
    return JournalEditorState(
      status: status ?? this.status,
      journalId: journalId ?? this.journalId,
      bodyText: bodyText ?? this.bodyText,
      selectedMood: selectedMood ?? this.selectedMood,
      availableMoods: availableMoods ?? this.availableMoods,
      failure: failure ?? this.failure,
      isDraft: isDraft ?? this.isDraft,
      isEditingExisting: isEditingExisting ?? this.isEditingExisting,
      lastAutoSavedAt: lastAutoSavedAt ?? this.lastAutoSavedAt,
    );
  }
}
