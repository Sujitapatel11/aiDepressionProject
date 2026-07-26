/// Chat Message Data Model mapping Django Chat API
class ChatMessageModel {
  final String id;
  final String connectionId;
  final int senderId;
  final String text;
  final bool isSelf;
  final DateTime timestamp;

  const ChatMessageModel({
    required this.id,
    required this.connectionId,
    required this.senderId,
    required this.text,
    required this.isSelf,
    required this.timestamp,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json, {int? currentUserId}) {
    final int sender = json['sender_id'] as int? ?? json['sender'] as int? ?? 0;
    return ChatMessageModel(
      id: (json['id'] ?? '').toString(),
      connectionId: (json['connection_id'] ?? '').toString(),
      senderId: sender,
      text: json['text'] as String? ?? json['message'] as String? ?? '',
      isSelf: currentUserId != null ? sender == currentUserId : (json['is_self'] as bool? ?? false),
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : DateTime.now(),
    );
  }
}
