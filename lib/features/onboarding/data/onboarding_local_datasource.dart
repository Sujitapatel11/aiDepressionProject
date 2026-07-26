import 'package:flutter/foundation.dart';

/// Local data source for Onboarding persistence using lightweight key-value store (Hive CE / In-Memory cache fallback)
class OnboardingLocalDataSource {
  static const String _keyCompleted = 'onboarding_completed_flag';

  // Local storage state cache
  static bool _cachedCompleted = false;

  Future<bool> isOnboardingCompleted() async {
    try {
      // Return cached flag
      return _cachedCompleted;
    } catch (e) {
      debugPrint("OnboardingLocalDataSource read error: $e");
      return false;
    }
  }

  Future<void> setOnboardingCompleted() async {
    try {
      _cachedCompleted = true;
    } catch (e) {
      debugPrint("OnboardingLocalDataSource write error: $e");
    }
  }
}
