/// Abstract service interface for Google Sign-In authentication
abstract class GoogleAuthService {
  /// Prompts Google Sign-In SDK and returns Google OAuth ID Token string
  Future<String?> getGoogleIdToken();

  /// Sign out from Google SDK session
  Future<void> signOut();
}
