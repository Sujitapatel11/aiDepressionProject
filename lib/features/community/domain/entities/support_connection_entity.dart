/// Pure domain entity representing an active peer connection
class SupportConnectionEntity {
  final String connectionId;
  final int peerId;
  final String peerUsername;
  final String alias;
  final String status;
  final DateTime createdAt;

  const SupportConnectionEntity({
    required this.connectionId,
    required this.peerId,
    required this.peerUsername,
    required this.alias,
    this.status = 'active',
    required this.createdAt,
  });

  bool get isActive => status.toLowerCase() == 'active';
}
