/// Peer Connection & Request Data Model mapping Django Support API
class ConnectionModel {
  final String id;
  final int userId;
  final String username;
  final String avatarUrl;
  final String status; // 'pending', 'accepted', 'blocked'
  final bool isOnline;

  const ConnectionModel({
    required this.id,
    required this.userId,
    required this.username,
    required this.avatarUrl,
    required this.status,
    required this.isOnline,
  });

  factory ConnectionModel.fromJson(Map<String, dynamic> json) {
    return ConnectionModel(
      id: (json['id'] ?? json['connection_id'] ?? '').toString(),
      userId: json['user_id'] as int? ?? json['id'] as int? ?? 0,
      username: json['username'] as String? ?? 'Peer Member',
      avatarUrl: json['avatar_url'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      isOnline: json['is_online'] as bool? ?? false,
    );
  }
}
