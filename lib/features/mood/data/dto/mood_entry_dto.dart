import '../../domain/entities/mood_entry_entity.dart';

/// Data Transfer Object for Mood Check-In REST API payload
class MoodEntryDto {
  final int? id;
  final String mood;
  final String? content;
  final String? createdAt;
  final String? updatedAt;

  const MoodEntryDto({
    this.id,
    required this.mood,
    this.content,
    this.createdAt,
    this.updatedAt,
  });

  factory MoodEntryDto.fromJson(Map<String, dynamic> json) {
    return MoodEntryDto(
      id: json['journal_id'] as int? ?? json['id'] as int?,
      mood: json['mood'] as String? ?? json['mood_state'] as String? ?? 'Calm',
      content: json['content'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'mood': mood,
      if (content != null) 'content': content,
    };
  }

  MoodEntryEntity toEntity() {
    final now = DateTime.now();
    return MoodEntryEntity(
      id: id,
      moodState: mood,
      note: content,
      createdAt: createdAt != null ? (DateTime.tryParse(createdAt!) ?? now) : now,
      updatedAt: updatedAt != null ? (DateTime.tryParse(updatedAt!) ?? now) : now,
    );
  }
}
