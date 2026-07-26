/// Domain entity representing an unsaved local reflection draft
class JournalDraftEntity {
  final String draftId;
  final String content;
  final String? moodState;
  final DateTime lastSavedAt;

  const JournalDraftEntity({
    required this.draftId,
    required this.content,
    this.moodState,
    required this.lastSavedAt,
  });

  bool get isEmpty => content.trim().isEmpty;

  JournalDraftEntity copyWith({
    String? draftId,
    String? content,
    String? moodState,
    DateTime? lastSavedAt,
  }) {
    return JournalDraftEntity(
      draftId: draftId ?? this.draftId,
      content: content ?? this.content,
      moodState: moodState ?? this.moodState,
      lastSavedAt: lastSavedAt ?? this.lastSavedAt,
    );
  }
}
