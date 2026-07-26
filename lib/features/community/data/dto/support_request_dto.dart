import '../../domain/entities/support_request_entity.dart';
import 'peer_user_dto.dart';

/// Data Transfer Object parsing `/api/support/requests/` REST API payload
class SupportRequestDto {
  final int id;
  final String requestId;
  final PeerUserDto fromUser;
  final PeerUserDto toUser;
  final String status;
  final String? createdAt;
  final String? expiresAt;

  const SupportRequestDto({
    required this.id,
    required this.requestId,
    required this.fromUser,
    required this.toUser,
    this.status = 'pending',
    this.createdAt,
    this.expiresAt,
  });

  factory SupportRequestDto.fromJson(Map<String, dynamic> json) {
    return SupportRequestDto(
      id: json['id'] as int? ?? 0,
      requestId: json['request_id'] as String? ?? json['id'].toString(),
      fromUser: json['from_user'] != null
          ? PeerUserDto.fromJson(json['from_user'] as Map<String, dynamic>)
          : const PeerUserDto(id: 0, username: 'Peer'),
      toUser: json['to_user'] != null
          ? PeerUserDto.fromJson(json['to_user'] as Map<String, dynamic>)
          : const PeerUserDto(id: 0, username: 'Peer'),
      status: json['status'] as String? ?? 'pending',
      createdAt: json['created_at'] as String?,
      expiresAt: json['expires_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'request_id': requestId,
      'from_user': fromUser.toJson(),
      'to_user': toUser.toJson(),
      'status': status,
      if (createdAt != null) 'created_at': createdAt,
      if (expiresAt != null) 'expires_at': expiresAt,
    };
  }

  SupportRequestEntity toEntity() {
    final now = DateTime.now();
    return SupportRequestEntity(
      id: id,
      requestId: requestId,
      fromUser: fromUser.toEntity(),
      toUser: toUser.toEntity(),
      status: status,
      createdAt: createdAt != null ? (DateTime.tryParse(createdAt!) ?? now) : now,
      expiresAt: expiresAt != null ? DateTime.tryParse(expiresAt!) : null,
    );
  }
}
