import '../../core/network/failure.dart';
import '../models/auth_tokens_model.dart';

abstract class AuthRepository {
  Future<({Failure? failure, AuthTokensModel? data})> login({
    required String usernameOrEmail,
    required String password,
  });

  Future<({Failure? failure, AuthTokensModel? data})> authenticateWithGoogle({
    required String idToken,
  });

  Future<Failure?> requestPasswordReset({
    required String email,
  });
}
