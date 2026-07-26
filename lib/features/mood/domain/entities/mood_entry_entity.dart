/// Pure domain entity representing a saved or submitted mood check-in record
class MoodEntryEntity {
  final int? id;
  final String moodState;
  final String? note;
  final DateTime createdAt;
  final DateTime updatedAt;

  const MoodEntryEntity({
    this.id,
    required this.moodState,
    this.note,
    required this.createdAt,
    required this.updatedAt,
  });

  MoodEntryEntity copyWith({
    int? id,
    String? moodState,
    String? note,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return MoodEntryEntity(
      id: id ?? this.id,
      moodState: moodState ?? this.moodState,
      note: note ?? this.note,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
