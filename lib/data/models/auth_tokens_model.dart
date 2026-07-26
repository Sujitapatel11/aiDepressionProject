/// Authentication Tokens Data Model received from Django REST Framework
class AuthTokensModel {
  final String token;
  final String refresh;
  final int userId;
  final String username;

  const AuthTokensModel({
    required this.token,
    required this.refresh,
    required this.userId,
    required this.username,
  });

  factory AuthTokensModel.fromJson(Map<String, dynamic> json) {
    return AuthTokensModel(
      token: json['token'] as String,
      refresh: json['refresh'] as String,
      userId: json['user_id'] as int,
      username: json['username'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'refresh': refresh,
      'user_id': userId,
      'username': username,
    };
  }
}
