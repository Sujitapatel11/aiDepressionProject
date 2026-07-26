/// Pure domain entity representing a journal reflection entry
class JournalEntryEntity {
  final int? journalId;
  final String content;
  final String? moodState;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isDeleted;

  const JournalEntryEntity({
    this.journalId,
    required this.content,
    this.moodState,
    required this.createdAt,
    required this.updatedAt,
    this.isDeleted = false,
  });

  String get titleSnippet {
    final lines = content.split('\n');
    if (lines.isNotEmpty && lines.first.trim().isNotEmpty) {
      return lines.first.trim();
    }
    if (content.length <= 40) return content;
    return '${content.substring(0, 40)}...';
  }

  JournalEntryEntity copyWith({
    int? journalId,
    String? content,
    String? moodState,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isDeleted,
  }) {
    return JournalEntryEntity(
      journalId: journalId ?? this.journalId,
      content: content ?? this.content,
      moodState: moodState ?? this.moodState,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }
}
