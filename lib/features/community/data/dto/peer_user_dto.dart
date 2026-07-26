import '../../domain/entities/peer_user_entity.dart';

/// Data Transfer Object parsing `/api/support/users/` REST API payload
class PeerUserDto {
  final int id;
  final String username;
  final int matchScore;
  final bool hasProfile;

  const PeerUserDto({
    required this.id,
    required this.username,
    this.matchScore = 50,
    this.hasProfile = false,
  });

  factory PeerUserDto.fromJson(Map<String, dynamic> json) {
    return PeerUserDto(
      id: json['id'] as int? ?? 0,
      username: json['username'] as String? ?? 'Anonymous Peer',
      matchScore: (json['match_score'] as num?)?.toInt() ?? 50,
      hasProfile: json['has_profile'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'match_score': matchScore,
      'has_profile': hasProfile,
    };
  }

  PeerUserEntity toEntity() {
    return PeerUserEntity(
      id: id,
      username: username,
      matchScore: matchScore,
      hasProfile: hasProfile,
    );
  }
}
