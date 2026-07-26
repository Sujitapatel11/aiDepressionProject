/// Domain entity representing JWT Access & Refresh token pair
class AuthTokensEntity {
  final String accessToken;
  final String refreshToken;
  final int userId;
  final String username;

  const AuthTokensEntity({
    required this.accessToken,
    required this.refreshToken,
    required this.userId,
    required this.username,
  });
}
