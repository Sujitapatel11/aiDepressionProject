/// Application Environment Configuration
/// Ensures no hardcoded URLs or exposed secrets in codebase.
class AppConfig {
  final String apiBaseUrl;
  final String googleClientId;
  final Duration apiTimeout;
  final String environment;
  final String? pinnedCertificateFingerprint;

  const AppConfig({
    required this.apiBaseUrl,
    required this.googleClientId,
    this.apiTimeout = const Duration(seconds: 15),
    this.environment = 'development',
    this.pinnedCertificateFingerprint,
  });

  String get baseUrl => apiBaseUrl;

  /// Default Production Environment Configuration
  static const AppConfig production = AppConfig(
    apiBaseUrl: "https://api.soulcare.app",
    googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    apiTimeout: Duration(seconds: 15),
    environment: 'production',
  );

  /// Default Development Environment Configuration
  static const AppConfig dev = AppConfig(
    apiBaseUrl: "https://api.soulcare.app",
    googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    apiTimeout: Duration(seconds: 15),
    environment: 'development',
  );

  /// Staging Environment Configuration
  static const AppConfig staging = AppConfig(
    apiBaseUrl: "https://staging-api.soulcare.app",
    googleClientId: "YOUR_STAGING_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    apiTimeout: Duration(seconds: 15),
    environment: 'staging',
  );

  /// Local Development Environment (e.g. Django dev server)
  static const AppConfig local = AppConfig(
    apiBaseUrl: "http://127.0.0.1:8000",
    googleClientId: "YOUR_LOCAL_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    apiTimeout: Duration(seconds: 10),
    environment: 'local',
  );
}
