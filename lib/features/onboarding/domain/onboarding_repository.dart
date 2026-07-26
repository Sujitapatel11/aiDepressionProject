/// Domain repository interface for Onboarding completion state management
abstract class OnboardingRepository {
  /// Check if the user has previously completed the onboarding flow
  Future<bool> isOnboardingCompleted();

  /// Persists the onboarding completion flag
  Future<void> setOnboardingCompleted();
}
