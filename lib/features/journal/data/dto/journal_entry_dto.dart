import '../../domain/entities/journal_entry_entity.dart';

/// Data Transfer Object parsing `/api/journal/` REST API payload
class JournalEntryDto {
  final int? journalId;
  final String content;
  final String? mood;
  final String? createdAt;
  final String? updatedAt;

  const JournalEntryDto({
    this.journalId,
    required this.content,
    this.mood,
    this.createdAt,
    this.updatedAt,
  });

  factory JournalEntryDto.fromJson(Map<String, dynamic> json) {
    return JournalEntryDto(
      journalId: json['journal_id'] as int? ?? json['id'] as int?,
      content: json['content'] as String? ?? '',
      mood: json['mood'] as String? ?? json['mood_state'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (journalId != null) 'journal_id': journalId,
      'content': content,
      if (mood != null) 'mood': mood,
    };
  }

  JournalEntryEntity toEntity() {
    final now = DateTime.now();
    return JournalEntryEntity(
      journalId: journalId,
      content: content,
      moodState: mood,
      createdAt: createdAt != null ? (DateTime.tryParse(createdAt!) ?? now) : now,
      updatedAt: updatedAt != null ? (DateTime.tryParse(updatedAt!) ?? now) : now,
    );
  }
}
