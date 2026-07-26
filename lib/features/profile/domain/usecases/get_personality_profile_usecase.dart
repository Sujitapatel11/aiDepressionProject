import '../entities/personality_profile_entity.dart';
import '../entities/profile_failure.dart';
import '../repository/profile_repository.dart';

/// Single responsibility UseCase to fetch Big Five personality profile
class GetPersonalityProfileUseCase {
  final ProfileRepository repository;

  const GetPersonalityProfileUseCase(this.repository);

  Future<({PersonalityProfileEntity? personality, ProfileFailure? failure})> execute() {
    return repository.getPersonalityProfile();
  }
}
