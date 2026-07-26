/// Journal Entry Data Model mapping Django Journal API
class JournalModel {
  final int id;
  final String title;
  final String content;
  final String mood; // 'happy', 'calm', 'anxious', 'sad', 'overwhelmed'
  final int moodIntensity; // 1 to 5
  final List<String> tags;
  final DateTime createdAt;
  final DateTime updatedAt;

  const JournalModel({
    required this.id,
    required this.title,
    required this.content,
    required this.mood,
    required this.moodIntensity,
    required this.tags,
    required this.createdAt,
    required this.updatedAt,
  });

  factory JournalModel.fromJson(Map<String, dynamic> json) {
    return JournalModel(
      id: json['id'] as int? ?? 0,
      title: json['title'] as String? ?? 'Untitled Entry',
      content: json['content'] as String? ?? '',
      mood: json['mood'] as String? ?? 'calm',
      moodIntensity: json['mood_intensity'] as int? ?? 3,
      tags: json['tags'] != null
          ? List<String>.from(json['tags'] as List)
          : <String>[],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      'mood': mood,
      'mood_intensity': moodIntensity,
      'tags': tags,
    };
  }
}
