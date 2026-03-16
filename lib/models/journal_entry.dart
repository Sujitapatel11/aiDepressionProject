import 'package:equatable/equatable.dart';

class JournalEntry extends Equatable {
  final String id;
  final String content;
  final DateTime createdAt;

  const JournalEntry({
    required this.id,
    required this.content,
    required this.createdAt,
  });

  factory JournalEntry.fromJson(Map<String, dynamic> json) {
    return JournalEntry(
      id: json['id'].toString(),
      content: json['content'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'created_at': createdAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [id, content, createdAt];
}
