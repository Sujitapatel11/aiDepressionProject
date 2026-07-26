import '../../domain/entities/support_connection_entity.dart';

/// Data Transfer Object parsing `/api/support/connections/` REST API payload
class SupportConnectionDto {
  final String connectionId;
  final int peerId;
  final String peerUsername;
  final String alias;
  final String status;
  final String? createdAt;

  const SupportConnectionDto({
    required this.connectionId,
    required this.peerId,
    required this.peerUsername,
    required this.alias,
    this.status = 'active',
    this.createdAt,
  });

  factory SupportConnectionDto.fromJson(Map<String, dynamic> json) {
    final peerMap = json['peer'] as Map<String, dynamic>? ?? {};
    return SupportConnectionDto(
      connectionId: json['connection_id'] as String? ?? '',
      peerId: peerMap['id'] as int? ?? 0,
      peerUsername: peerMap['username'] as String? ?? 'Peer Support',
      alias: json['alias'] as String? ?? 'Peer Support',
      status: json['status'] as String? ?? 'active',
      createdAt: json['created_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'connection_id': connectionId,
      'peer': {'id': peerId, 'username': peerUsername},
      'alias': alias,
      'status': status,
      if (createdAt != null) 'created_at': createdAt,
    };
  }

  SupportConnectionEntity toEntity() {
    final now = DateTime.now();
    return SupportConnectionEntity(
      connectionId: connectionId,
      peerId: peerId,
      peerUsername: peerUsername,
      alias: alias,
      status: status,
      createdAt: createdAt != null ? (DateTime.tryParse(createdAt!) ?? now) : now,
    );
  }
}
