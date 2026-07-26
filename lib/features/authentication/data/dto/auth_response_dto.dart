import '../../domain/entities/auth_tokens_entity.dart';

/// DTO for authentication response containing JWT tokens and user details
class AuthResponseDto {
  final String token;
  final String refresh;
  final int userId;
  final String username;

  const AuthResponseDto({
    required this.token,
    required this.refresh,
    required this.userId,
    required this.username,
  });

  factory AuthResponseDto.fromJson(Map<String, dynamic> json) {
    return AuthResponseDto(
      token: json['token'] as String? ?? '',
      refresh: json['refresh'] as String? ?? '',
      userId: json['user_id'] as int? ?? 0,
      username: json['username'] as String? ?? '',
    );
  }

  AuthTokensEntity toEntity() {
    return AuthTokensEntity(
      accessToken: token,
      refreshToken: refresh,
      userId: userId,
      username: username,
    );
  }
}
