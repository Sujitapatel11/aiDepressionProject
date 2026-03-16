import 'package:equatable/equatable.dart';

class Insight extends Equatable {
  final String id;
  final String title;
  final String message;
  final DateTime createdAt;
  final bool isDismissed;

  const Insight({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
    required this.isDismissed,
  });

  factory Insight.fromJson(Map<String, dynamic> json) {
    return Insight(
      id: json['id'].toString(),
      title: json['title'] as String,
      message: json['message'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      isDismissed: json['is_dismissed'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'message': message,
      'created_at': createdAt.toIso8601String(),
      'is_dismissed': isDismissed,
    };
  }

  @override
  List<Object?> get props => [id, title, message, createdAt, isDismissed];
}
