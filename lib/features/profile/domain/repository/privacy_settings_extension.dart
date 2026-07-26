import 'entities/profile_failure.dart';

/// Extension contract preparing future privacy preference controls
abstract class PrivacySettingsExtension {
  /// Prepares updating profile visibility
  Future<({bool success, ProfileFailure? failure})> updateVisibility({required bool isPrivate});
}
