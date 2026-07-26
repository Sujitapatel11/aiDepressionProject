import 'entities/profile_failure.dart';

/// Extension contract preparing future notification preferences
abstract class NotificationSettingsExtension {
  /// Prepares updating push notification toggles
  Future<({bool success, ProfileFailure? failure})> updateNotificationPreferences({
    required bool dailyReminder,
    required bool peerRequestAlerts,
  });
}
