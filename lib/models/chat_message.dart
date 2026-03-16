import 'package:equatable/equatable.dart';

class ChatMessage extends Equatable {
  final String id;
  final String content;
  final String senderId;
  final DateTime timestamp;
  final bool isSelf;

  const ChatMessage({
    required this.id,
    required this.content,
    required this.senderId,
    required this.timestamp,
    required this.isSelf,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json, {required String currentUserId}) {
    final senderId = json['sender_id'].toString();
    return ChatMessage(
      id: json['id'].toString(),
      content: json['content'] as String,
      senderId: senderId,
      timestamp: DateTime.parse(json['timestamp'] as String),
      isSelf: senderId == currentUserId,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'sender_id': senderId,
      'timestamp': timestamp.toIso8601String(),
      'is_self': isSelf,
    };
  }

  @override
  List<Object?> get props => [id, content, senderId, timestamp, isSelf];
}
