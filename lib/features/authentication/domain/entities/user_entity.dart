/// Domain entity representing an authenticated SoulCare User
class UserEntity {
  final int id;
  final String username;
  final String email;

  const UserEntity({
    required this.id,
    required this.username,
    required this.email,
  });
}
