import 'peer_user_entity.dart';

/// Pure domain entity representing a peer support request
class SupportRequestEntity {
  final int id;
  final String requestId;
  final PeerUserEntity fromUser;
  final PeerUserEntity toUser;
  final String status;
  final DateTime createdAt;
  final DateTime? expiresAt;

  const SupportRequestEntity({
    required this.id,
    required this.requestId,
    required this.fromUser,
    required this.toUser,
    this.status = 'pending',
    required this.createdAt,
    this.expiresAt,
  });

  bool get isPending => status.toLowerCase() == 'pending';
}
