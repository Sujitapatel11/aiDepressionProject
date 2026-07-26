import '../entities/auth_failure.dart';
import '../entities/auth_tokens_entity.dart';

/// Abstract Domain Repository interface for Authentication operations
abstract class AuthRepository {
  Future<({AuthTokensEntity? tokens, AuthFailure? failure})> login({
    required String username,
    required String password,
  });

  Future<({AuthTokensEntity? tokens, AuthFailure? failure})> signup({
    required String username,
    required String email,
    required String password,
    required String passwordConfirm,
  });

  Future<({AuthTokensEntity? tokens, AuthFailure? failure})> continueWithGoogle({
    required String idToken,
  });

  Future<void> logout();

  Future<bool> requestPasswordReset(String email);

  Future<({bool success, AuthFailure? failure})> confirmPasswordReset({
    required String uid,
    required String token,
    required String newPassword,
    required String reNewPassword,
  });

  Future<String?> getValidAccessToken();
}
