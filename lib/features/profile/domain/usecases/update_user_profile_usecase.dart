import '../entities/profile_failure.dart';
import '../entities/user_profile_entity.dart';
import '../repository/profile_repository.dart';

/// Single responsibility UseCase to update user display name
class UpdateUserProfileUseCase {
  final ProfileRepository repository;

  const UpdateUserProfileUseCase(this.repository);

  Future<({UserProfileEntity? profile, ProfileFailure? failure})> execute(String displayName) {
    return repository.updateDisplayName(displayName);
  }
}
