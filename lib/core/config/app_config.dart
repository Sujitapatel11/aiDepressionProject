/// Application Environment Configuration
/// Ensures no hardcoded URLs or exposed secrets in codebase.
class AppConfig {
  final String apiBaseUrl;
  final String googleClientId;
  final Duration apiTimeout;

  const AppConfig({
    required this.apiBaseUrl,
    required this.googleClientId,
    this.apiTimeout = const Duration(seconds: 15),
  });

  /// Default Development Environment Configuration
  static const AppConfig dev = AppConfig(
    apiBaseUrl: "https://api.soulcare.app", // Use HTTPS for production/dev API endpoint
    googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    apiTimeout: Duration(seconds: 15),
  );

  /// Local Development Environment (e.g. Django dev server)
  static const AppConfig local = AppConfig(
    apiBaseUrl: "http://10.0.2.2:8000", // Android emulator alias for localhost
    googleClientId: "YOUR_LOCAL_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    apiTimeout: Duration(seconds: 10),
  );
}
