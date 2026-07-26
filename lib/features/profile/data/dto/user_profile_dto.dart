import '../../domain/entities/user_profile_entity.dart';

/// Data Transfer Object parsing user profile identity payload
class UserProfileDto {
  final int id;
  final String username;
  final String email;
  final String displayName;
  final String? avatarUrl;
  final String? joinedAt;

  const UserProfileDto({
    required this.id,
    required this.username,
    required this.email,
    required this.displayName,
    this.avatarUrl,
    this.joinedAt,
  });

  factory UserProfileDto.fromJson(Map<String, dynamic> json) {
    return UserProfileDto(
      id: json['id'] as int? ?? 0,
      username: json['username'] as String? ?? 'User',
      email: json['email'] as String? ?? '',
      displayName: json['display_name'] as String? ?? json['username'] as String? ?? 'User',
      avatarUrl: json['avatar_url'] as String?,
      joinedAt: json['joined_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'display_name': displayName,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      if (joinedAt != null) 'joined_at': joinedAt,
    };
  }

  UserProfileEntity toEntity() {
    final now = DateTime.now();
    return UserProfileEntity(
      id: id,
      username: username,
      email: email,
      displayName: displayName,
      avatarUrl: avatarUrl,
      joinedAt: joinedAt != null ? (DateTime.tryParse(joinedAt!) ?? now) : now,
    );
  }
}
