import '../repository/profile_repository.dart';

/// Single responsibility UseCase to execute session logout
class LogoutUserUseCase {
  final ProfileRepository repository;

  const LogoutUserUseCase(this.repository);

  Future<void> execute() {
    return repository.logout();
  }
}
