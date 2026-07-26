/// Pure domain entity representing user account identity profile
class UserProfileEntity {
  final int id;
  final String username;
  final String email;
  final String displayName;
  final String? avatarUrl;
  final DateTime? joinedAt;

  const UserProfileEntity({
    required this.id,
    required this.username,
    required this.email,
    required this.displayName,
    this.avatarUrl,
    this.joinedAt,
  });

  UserProfileEntity copyWith({
    int? id,
    String? username,
    String? email,
    String? displayName,
    String? avatarUrl,
    DateTime? joinedAt,
  }) {
    return UserProfileEntity(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      joinedAt: joinedAt ?? this.joinedAt,
    );
  }
}
