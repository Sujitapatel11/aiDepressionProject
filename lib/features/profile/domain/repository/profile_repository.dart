import 'entities/personality_profile_entity.dart';
import 'entities/profile_failure.dart';
import 'entities/user_profile_entity.dart';

/// Domain contract for Profile & Settings operations
abstract class ProfileRepository {
  /// Fetches user profile identity
  Future<({UserProfileEntity? profile, ProfileFailure? failure})> getUserProfile();

  /// Fetches Big Five personality profile
  Future<({PersonalityProfileEntity? personality, ProfileFailure? failure})> getPersonalityProfile();

  /// Updates user display name
  Future<({UserProfileEntity? profile, ProfileFailure? failure})> updateDisplayName(String displayName);

  /// Logs out current user session
  Future<void> logout();
}
