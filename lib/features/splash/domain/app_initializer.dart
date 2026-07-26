/// Enumeration of target initial navigation destinations after splash completion
enum InitialDestination {
  onboarding,
  login,
  dashboard,
}

/// Abstract contract for startup initialization logic
abstract class AppInitializer {
  /// Determines the initial route destination by inspecting local persistence & auth tokens
  Future<InitialDestination> determineInitialDestination();
}
