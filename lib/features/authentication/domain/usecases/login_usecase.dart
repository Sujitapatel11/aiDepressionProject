import '../entities/auth_failure.dart';
import '../entities/auth_tokens_entity.dart';
import '../repository/auth_repository.dart';

/// Single-responsibility UseCase for User Login
class LoginUseCase {
  final AuthRepository repository;

  LoginUseCase(this.repository);

  Future<({AuthTokensEntity? tokens, AuthFailure? failure})> execute({
    required String username,
    required String password,
  }) {
    return repository.login(username: username, password: password);
  }
}
