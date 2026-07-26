import '../entities/profile_failure.dart';
import '../entities/user_profile_entity.dart';
import '../repository/profile_repository.dart';

/// Single responsibility UseCase to fetch user profile identity
class GetUserProfileUseCase {
  final ProfileRepository repository;

  const GetUserProfileUseCase(this.repository);

  Future<({UserProfileEntity? profile, ProfileFailure? failure})> execute() {
    return repository.getUserProfile();
  }
}
